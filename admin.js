import { apiFetch, formatDateLabel, escapeHtml } from './journal-api.js';

const exportBtn = document.getElementById('export-csv');
const content = document.getElementById('admin-content');
const progressSummary = document.getElementById('admin-progress');

let adminData = null;

if (exportBtn) {
  exportBtn.addEventListener('click', async () => {
  try {
    const resp = await fetch('/api/journal/export');
    if (!resp.ok) throw new Error('Export failed');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message || 'Could not export CSV');
  }
  });
}

function showLoadError(message) {
  const html = `<p class="journal-error">${escapeHtml(message)}</p>`;
  if (content) content.innerHTML = html;
  if (progressSummary) progressSummary.innerHTML = html;
}

function renderProgress(progress) {
  progressSummary.innerHTML = `
    <div class="journal-progress journal-progress--admin">
      <div class="journal-stat">
        <span class="journal-stat-value">${progress.currentDay ?? '—'}</span>
        <span class="journal-stat-label">Current day</span>
      </div>
      <div class="journal-stat">
        <span class="journal-stat-value">${progress.daysRemaining}</span>
        <span class="journal-stat-label">Days remaining</span>
      </div>
    </div>
    <p style="margin-top:12px;color:var(--journal-muted);font-size:0.9rem;">
      Study period: ${escapeHtml(formatDateLabel(progress.studyStartDate))} — ${escapeHtml(formatDateLabel(progress.studyEndDate))}
    </p>
  `;
}

function formatAnswerLabel(q, answers) {
  const value = answers?.[q.id];
  if (value == null || String(value).trim() === '') return '';

  if (q.type === 'yesno') return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value;

  if (q.type === 'select') {
    if (value === 'other') {
      const other = answers[`${q.id}_other`] || '';
      return other ? `Other: ${other}` : 'Other';
    }
    return q.options?.find((o) => o.value === value)?.label || value;
  }

  if (q.type === 'multiselect') {
    let selected = [];
    try { selected = JSON.parse(value); } catch { selected = []; }
    if (!selected.length) return '';
    return selected.map((v) => {
      if (v === 'other') {
        const other = answers[`${q.id}_other`] || '';
        return other ? `Other: ${other}` : 'Other';
      }
      return q.options?.find((o) => o.value === v)?.label || v;
    }).join('; ');
  }

  return String(value);
}

function renderParticipantBlock(participant, questions) {
  const headers = ['Date', 'Day', 'Submitted', ...questions.map((q) => q.label), 'Actions'];

  let tableRows = '';
  if (!participant.rows.length) {
    tableRows = `<tr><td colspan="${headers.length}" class="journal-empty">No entries yet</td></tr>`;
  } else {
    tableRows = participant.rows
      .map((row) => {
        const answerCells = questions.map((q) => {
          if (row.answers?.device_used === 'no' && q.showWhen) return '';
          return formatAnswerLabel(q, row.answers);
        });
        return `
          <tr data-user-id="${escapeHtml(participant.id)}" data-date="${escapeHtml(row.date)}">
            <td>${escapeHtml(formatDateLabel(row.date))}</td>
            <td>${escapeHtml(String(row.studyDay ?? '—'))}</td>
            <td>${escapeHtml(row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—')}</td>
            ${answerCells.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}
            <td>
              <button type="button" class="journal-btn journal-btn--danger journal-btn--small admin-remove-btn" data-user-id="${escapeHtml(participant.id)}" data-date="${escapeHtml(row.date)}">Remove</button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  return `
    <div class="journal-participant-block">
      <h3>${escapeHtml(participant.name)} <span class="journal-badge">${participant.entryCount} entries</span></h3>
      <p style="font-size:0.85rem;color:var(--journal-muted);margin:-6px 0 12px;">
        Journal link: <code>${escapeHtml(participant.id)}.html</code>
      </p>
      <div class="journal-table-wrap">
        <table class="journal-table">
          <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function attachRemoveHandlers() {
  content.querySelectorAll('.admin-remove-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      const date = btn.dataset.date;
      const label = formatDateLabel(date);
      const participant = adminData?.participants?.find((p) => p.id === userId);
      const name = participant?.name || userId;

      if (!confirm(`Remove ${name}'s entry for ${label}?\n\nThis cannot be undone. The participant will no longer see this entry.`)) {
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Removing…';

      try {
        await apiFetch('/delete', {
          method: 'POST',
          body: JSON.stringify({ userId, date }),
        });
        await loadAdminData();
      } catch (err) {
        alert(err.message || 'Could not remove entry');
        btn.disabled = false;
        btn.textContent = 'Remove';
      }
    });
  });
}

async function loadAdminData() {
  if (!content || !progressSummary) {
    showLoadError('Admin page failed to load. Check that admin.html includes admin-content and admin-progress.');
    return;
  }

  content.innerHTML = '<p class="journal-empty">Loading…</p>';
  try {
    adminData = await apiFetch('/admin');
    renderProgress(adminData.progress);
    content.innerHTML = adminData.participants
      .map((p) => renderParticipantBlock(p, adminData.questions))
      .join('');
    attachRemoveHandlers();
  } catch (err) {
    showLoadError(err.message || 'Could not load data. Check that api/journal/admin.js is the server file (not the browser admin.js).');
  }
}

loadAdminData();
