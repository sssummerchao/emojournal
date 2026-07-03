import { apiFetch, formatDateLabel, escapeHtml } from './journal-api.js';

const exportBtn = document.getElementById('export-csv');
const content = document.getElementById('admin-content');
const progressSummary = document.getElementById('admin-progress');

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
  const headers = ['Date', 'Day', 'Submitted', ...questions.map((q) => q.label)];

  let tableRows = '';
  if (!participant.rows.length) {
    tableRows = `<tr><td colspan="${headers.length}" class="journal-empty">No entries yet</td></tr>`;
  } else {
    tableRows = participant.rows
      .map((row) => {
        const cells = [
          formatDateLabel(row.date),
          row.studyDay ?? '—',
          row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—',
          ...questions.map((q) => {
            if (row.answers?.device_used === 'no' && q.showWhen) return '';
            return formatAnswerLabel(q, row.answers);
          }),
        ];
        return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
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

async function loadAdminData() {
  content.innerHTML = '<p class="journal-empty">Loading…</p>';
  try {
    const data = await apiFetch('/admin');
    renderProgress(data.progress);
    content.innerHTML = data.participants
      .map((p) => renderParticipantBlock(p, data.questions))
      .join('');
  } catch (err) {
    content.innerHTML = `<p class="journal-error">${escapeHtml(err.message || 'Could not load data')}</p>`;
  }
}

loadAdminData();
