import {
  apiFetch,
  formatDateLabel,
  getParticipantId,
  escapeHtml,
} from './journal-api.js';

const journalForm = document.getElementById('journal-form');
const formMessage = document.getElementById('form-message');
const submitBtn = document.getElementById('submit-btn');
const submittedBanner = document.getElementById('submitted-banner');
const historyCalendar = document.getElementById('history-calendar');
const historyDetail = document.getElementById('history-detail');
const questionsContainer = document.getElementById('questions-container');
const userLabel = document.getElementById('user-label');
const statDay = document.getElementById('stat-day');
const statRemaining = document.getElementById('stat-remaining');
const statCompleted = document.getElementById('stat-completed');
const studyStatus = document.getElementById('study-status');
const todayHeading = document.getElementById('today-heading');
const todayCard = document.getElementById('today-card');

const participantId = getParticipantId();
let state = null;
let selectedCalendarDate = null;

if (!participantId) {
  document.body.innerHTML = '<p style="padding:24px;">Invalid journal link.</p>';
} else {
  loadJournal();
}

function showMessage(el, text, type = 'error') {
  el.hidden = false;
  el.className = type === 'success' ? 'journal-form-message journal-success' : 'journal-form-message journal-error';
  el.textContent = text;
}

function parseIsoDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hasAnswers(answers) {
  if (!answers) return false;
  return Object.entries(answers).some(([key, v]) => !key.endsWith('_other') && String(v || '').trim() !== '');
}

function canEditDate(isoDate) {
  if (!state?.today || !isoDate) return false;
  if (isoDate > state.today) return false;
  if (isoDate > state.progress.studyEndDate) return false;
  return true;
}

function canEditToday() {
  const status = state?.progress?.status;
  return (status === 'active' || status === 'not_started') && canEditDate(state.today);
}

function renderProgress(progress, history) {
  const completed = history.filter((h) => hasAnswers(h.answers)).length;
  statDay.textContent = progress.currentDay ?? '—';
  statRemaining.textContent = progress.daysRemaining;
  statCompleted.textContent = completed;

  studyStatus.className = 'journal-status';
  if (progress.status === 'ended') {
    studyStatus.classList.add('journal-status--ended');
    studyStatus.textContent = `Study ended ${formatDateLabel(progress.studyEndDate)}. You can still review and update past entries below.`;
    submitBtn.disabled = true;
  } else if (progress.status === 'not_started') {
    studyStatus.classList.add('journal-status--plain');
    studyStatus.textContent = `Study period: ${formatDateLabel(progress.studyStartDate)} — ${formatDateLabel(progress.studyEndDate)}`;
    submitBtn.disabled = !canEditToday();
  } else {
    studyStatus.classList.add('journal-status--active');
    studyStatus.textContent = `Day ${progress.currentDay} of ${progress.studyDurationDays} · ${progress.daysRemaining} day${progress.daysRemaining === 1 ? '' : 's'} remaining`;
    submitBtn.disabled = !canEditToday();
  }

  todayHeading.textContent = `Today's entry — ${formatDateLabel(progress.today)}`;
}

function updateSubmittedBanner() {
  if (!submittedBanner) return;
  if (state?.todayEntry && hasAnswers(state.todayEntry.answers)) {
    submittedBanner.hidden = false;
    submittedBanner.textContent = "You already submitted today's entry. You can update your answers below.";
  } else {
    submittedBanner.hidden = true;
  }
}

function updateTodaySubmitLabel() {
  if (!submitBtn) return;
  const hasSubmitted = state?.todayEntry && hasAnswers(state.todayEntry.answers);
  submitBtn.textContent = hasSubmitted ? 'Update entry' : 'Submit';
}

function getGateAnswerFrom(container) {
  const field = container.querySelector('[data-question-id="device_used"]');
  if (!field) return '';
  const selected = field.querySelector('.journal-yesno-btn.selected');
  return selected ? selected.dataset.value : '';
}

function isQuestionHidden(q, answers) {
  if (!q.showWhen) return false;
  return answers?.[q.showWhen.questionId] !== q.showWhen.value;
}

function updateVisibilityIn(container, questions) {
  const gate = getGateAnswerFrom(container);
  questions.forEach((q) => {
    if (!q.showWhen) return;
    const field = container.querySelector(`[data-question-id="${q.id}"]`);
    if (!field) return;
    const hidden = gate !== q.showWhen.value;
    field.hidden = hidden;
    field.classList.toggle('journal-field--hidden', hidden);
  });
}

function parseMultiselectValue(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatAnswerLabel(q, answers) {
  const value = answers?.[q.id];
  if (value == null || String(value).trim() === '') return '';

  if (q.type === 'yesno') {
    return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value;
  }

  if (q.type === 'select') {
    if (value === 'other') {
      const other = answers[`${q.id}_other`] || '';
      return other ? `Other: ${other}` : 'Other';
    }
    const opt = q.options?.find((o) => o.value === value);
    return opt?.label || value;
  }

  if (q.type === 'multiselect') {
    const selected = parseMultiselectValue(value);
    if (!selected.length) return '';
    return selected
      .map((v) => {
        if (v === 'other') {
          const other = answers[`${q.id}_other`] || '';
          return other ? `Other: ${other}` : 'Other';
        }
        const opt = q.options?.find((o) => o.value === v);
        return opt?.label || v;
      })
      .join('; ');
  }

  return String(value);
}

function renderQuestionInto(container, q, answers, editable) {
  const value = answers?.[q.id] ?? '';
  const otherValue = answers?.[`${q.id}_other`] ?? '';

  const wrap = document.createElement('div');
  wrap.className = 'journal-field';
  wrap.dataset.questionId = q.id;
  if (isQuestionHidden(q, answers)) wrap.hidden = true;

  const label = document.createElement('div');
  label.className = 'journal-field-label';
  label.appendChild(document.createTextNode(q.label));
  const required = document.createElement('span');
  required.className = 'journal-required';
  required.textContent = ' *';
  required.setAttribute('aria-label', 'required');
  label.appendChild(required);
  wrap.appendChild(label);

  if (q.type === 'yesno') {
    const group = document.createElement('div');
    group.className = 'journal-yesno';
    ['yes', 'no'].forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'journal-yesno-btn';
      btn.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
      btn.dataset.value = opt;
      btn.disabled = !editable;
      if (value === opt) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        group.querySelectorAll('.journal-yesno-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateVisibilityIn(container, state.questions);
      });
      group.appendChild(btn);
    });
    wrap.appendChild(group);
  } else if (q.type === 'select') {
    const group = document.createElement('div');
    group.className = 'journal-choice-list';
    group.setAttribute('role', 'radiogroup');

    q.options.forEach((opt) => {
      const row = document.createElement('label');
      row.className = 'journal-choice-row';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `${container.id || 'form'}-${q.id}`;
      input.value = opt.value;
      input.disabled = !editable;
      input.checked = value === opt.value;
      input.addEventListener('change', () => {
        toggleOtherInput(wrap, opt.hasText && input.checked);
      });
      row.appendChild(input);
      const span = document.createElement('span');
      span.className = 'journal-choice-text';
      span.textContent = opt.label;
      row.appendChild(span);
      group.appendChild(row);
    });
    wrap.appendChild(group);

    if (q.options.some((o) => o.hasText)) {
      const otherInput = document.createElement('input');
      otherInput.type = 'text';
      otherInput.className = 'journal-other-input';
      otherInput.placeholder = 'Brief description';
      otherInput.value = otherValue;
      otherInput.disabled = !editable;
      otherInput.hidden = value !== 'other';
      wrap.appendChild(otherInput);
    }
  } else if (q.type === 'multiselect') {
    const selected = parseMultiselectValue(value);
    const group = document.createElement('div');
    group.className = 'journal-choice-list';

    q.options.forEach((opt) => {
      const row = document.createElement('label');
      row.className = 'journal-choice-row';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = opt.value;
      input.disabled = !editable;
      input.checked = selected.includes(opt.value);
      input.addEventListener('change', () => {
        if (opt.hasText) {
          const otherInput = wrap.querySelector('.journal-other-input');
          if (otherInput) otherInput.hidden = !wrap.querySelector('input[value="other"]:checked');
        }
      });
      row.appendChild(input);
      const span = document.createElement('span');
      span.className = 'journal-choice-text';
      span.textContent = opt.label;
      row.appendChild(span);
      group.appendChild(row);
    });
    wrap.appendChild(group);

    if (q.options.some((o) => o.hasText)) {
      const otherInput = document.createElement('input');
      otherInput.type = 'text';
      otherInput.className = 'journal-other-input';
      otherInput.placeholder = 'Please describe briefly';
      otherInput.value = otherValue;
      otherInput.disabled = !editable;
      otherInput.hidden = !selected.includes('other');
      wrap.appendChild(otherInput);
    }
  } else if (q.type === 'textarea') {
    const ta = document.createElement('textarea');
    ta.id = `q-${container.id || 'form'}-${q.id}`;
    ta.name = q.id;
    ta.placeholder = q.placeholder || '';
    ta.value = value || '';
    ta.disabled = !editable;
    wrap.appendChild(ta);
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `q-${container.id || 'form'}-${q.id}`;
    input.name = q.id;
    input.placeholder = q.placeholder || '';
    input.value = value || '';
    input.disabled = !editable;
    wrap.appendChild(input);
  }

  return wrap;
}

function toggleOtherInput(wrap, show) {
  const otherInput = wrap.querySelector('.journal-other-input');
  if (otherInput) otherInput.hidden = !show;
}

function collectAnswersFrom(container, questions) {
  const answers = {};
  const gate = getGateAnswerFrom(container);
  answers.device_used = gate;

  for (const q of questions) {
    if (q.id === 'device_used') continue;

    if (gate === 'no' && q.showWhen) {
      answers[q.id] = '';
      if (q.type === 'select' || q.type === 'multiselect') answers[`${q.id}_other`] = '';
      continue;
    }

    const field = container.querySelector(`[data-question-id="${q.id}"]`);
    if (!field || field.hidden) {
      answers[q.id] = '';
      if (q.type === 'select' || q.type === 'multiselect') answers[`${q.id}_other`] = '';
      continue;
    }

    if (q.type === 'select') {
      const selected = field.querySelector('input[type="radio"]:checked');
      answers[q.id] = selected ? selected.value : '';
      const otherInput = field.querySelector('.journal-other-input');
      answers[`${q.id}_other`] = otherInput && !otherInput.hidden ? otherInput.value : '';
    } else if (q.type === 'multiselect') {
      const checked = [...field.querySelectorAll('input[type="checkbox"]:checked')].map((el) => el.value);
      answers[q.id] = checked.length ? JSON.stringify(checked) : '';
      const otherInput = field.querySelector('.journal-other-input');
      answers[`${q.id}_other`] = otherInput && !otherInput.hidden ? otherInput.value : '';
    } else {
      const input = field.querySelector('input[type="text"], textarea');
      answers[q.id] = input ? input.value : '';
    }
  }

  return answers;
}

function validateRequiredAnswers(questions, answers) {
  const gate = answers.device_used;
  if (!gate) return 'Please answer: Did you use the device today?';
  if (gate === 'no') return '';

  for (const q of questions) {
    if (q.id === 'device_used') continue;
    if (q.showWhen && gate !== q.showWhen.value) continue;

    const value = answers[q.id];
    if (value == null || String(value).trim() === '') {
      return `Please answer: ${q.label}`;
    }

    if (q.type === 'select' && value === 'other' && !String(answers[`${q.id}_other`] || '').trim()) {
      return `Please describe: ${q.label}`;
    }

    if (q.type === 'multiselect') {
      const selected = parseMultiselectValue(value);
      if (!selected.length) return `Please answer: ${q.label}`;
      if (selected.includes('other') && !String(answers[`${q.id}_other`] || '').trim()) {
        return `Please describe: ${q.label}`;
      }
    }
  }

  return '';
}

function renderFormInto(container, questions, entryAnswers, editable) {
  container.innerHTML = '';
  questions.forEach((q) => {
    container.appendChild(renderQuestionInto(container, q, entryAnswers, editable));
  });
  updateVisibilityIn(container, questions);
}

function renderTodayForm() {
  renderFormInto(
    questionsContainer,
    state.questions,
    state.todayEntry?.answers || {},
    canEditToday(),
  );
  updateSubmittedBanner();
  updateTodaySubmitLabel();
}

function upsertHistoryRow(date, entry, studyDay) {
  const row = {
    date,
    studyDay,
    answers: entry.answers,
    submittedAt: entry.submittedAt,
  };
  const idx = state.history.findIndex((h) => h.date === date);
  if (idx >= 0) state.history[idx] = row;
  else state.history.unshift(row);
  state.history.sort((a, b) => b.date.localeCompare(a.date));
}

async function saveEntry(date, answers, messageEl, submitButton) {
  const validationMessage = validateRequiredAnswers(state.questions, answers);
  if (validationMessage) {
    showMessage(messageEl, validationMessage);
    return false;
  }

  submitButton.disabled = true;
  try {
    const data = await apiFetch('/entries', {
      method: 'POST',
      body: JSON.stringify({ date, answers }),
    }, participantId);

    state.progress = data.progress;
    const studyDay = date === state.today
      ? data.progress.currentDay
      : state.history.find((h) => h.date === date)?.studyDay ?? null;

    upsertHistoryRow(date, data.entry, studyDay);

    if (date === state.today) {
      state.todayEntry = data.entry;
      renderTodayForm();
    }

    renderProgress(state.progress, state.history);
    renderCalendar(state.questions, state.history, state.progress);

    if (date === state.today) {
      showMessage(messageEl, 'Entry submitted. Thank you!', 'success');
    } else {
      showMessage(messageEl, 'Entry updated.', 'success');
      openPastEntryEditor(state.history.find((h) => h.date === date));
    }

    return true;
  } catch (err) {
    showMessage(messageEl, err.message || 'Could not save entry');
    return false;
  } finally {
    if (date === state.today ? canEditToday() : canEditDate(date)) {
      submitButton.disabled = false;
    }
  }
}

function eachStudyDate(progress, fn) {
  const start = parseIsoDate(progress.studyStartDate);
  const end = parseIsoDate(progress.studyEndDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    fn(toIsoDate(new Date(d)));
  }
}

function closePastEditor() {
  historyDetail.hidden = true;
  historyDetail.innerHTML = '';
}

function openPastEntryEditor(entry) {
  if (!entry) {
    closePastEditor();
    return;
  }

  selectedCalendarDate = entry.date;
  const editable = canEditDate(entry.date) && entry.date !== state.today;
  historyDetail.hidden = false;
  historyDetail.innerHTML = `
    <div class="journal-history-detail-header">Edit entry — ${escapeHtml(formatDateLabel(entry.date))}</div>
    <form id="past-entry-form">
      <div id="past-questions-container"></div>
      <div id="past-form-message" class="journal-form-message" hidden></div>
      <div class="journal-actions">
        <button type="submit" id="past-submit-btn" class="journal-btn journal-btn--primary" ${editable ? '' : 'disabled'}>
          Update entry
        </button>
      </div>
    </form>
  `;

  const pastContainer = document.getElementById('past-questions-container');
  renderFormInto(pastContainer, state.questions, entry.answers || {}, editable);

  const pastForm = document.getElementById('past-entry-form');
  const pastMessage = document.getElementById('past-form-message');
  const pastSubmit = document.getElementById('past-submit-btn');

  pastForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    pastMessage.hidden = true;
    if (!editable) return;
    const answers = collectAnswersFrom(pastContainer, state.questions);
    await saveEntry(entry.date, answers, pastMessage, pastSubmit);
  });
}

function renderCalendar(questions, history, progress) {
  const withEntries = history.filter((h) => hasAnswers(h.answers));
  const entriesByDate = Object.fromEntries(withEntries.map((h) => [h.date, h]));

  if (!withEntries.length) {
    historyCalendar.innerHTML = '<p class="journal-empty">No entries yet.</p>';
    closePastEditor();
    return;
  }

  const months = [];
  const seen = new Set();
  const addMonth = (iso) => {
    const d = parseIsoDate(iso);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }
  };
  eachStudyDate(progress, addMonth);
  withEntries.forEach((h) => addMonth(h.date));
  months.sort((a, b) => a.year - b.year || a.month - b.month);

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  historyCalendar.innerHTML = months.map(({ year, month }) => {
    const monthName = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    let cells = '';
    for (let i = 0; i < startPad; i++) {
      cells += '<div class="journal-cal-cell journal-cal-cell--empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = toIsoDate(new Date(year, month, day));
      const inStudy = iso >= progress.studyStartDate && iso <= progress.studyEndDate;
      const isToday = iso === progress.today;
      const hasEntry = !!entriesByDate[iso];
      const isSelected = selectedCalendarDate === iso;

      let cls = 'journal-cal-cell';
      if (hasEntry && isToday) cls += ' journal-cal-cell--has-entry journal-cal-cell--today';
      else if (hasEntry && iso <= progress.today) cls += ' journal-cal-cell--has-entry';
      else if (!inStudy) cls += ' journal-cal-cell--out';
      else if (inStudy && iso < progress.today) cls += ' journal-cal-cell--past';
      if (isSelected) cls += ' journal-cal-cell--selected';

      const clickable = hasEntry && iso <= progress.today;
      cells += `<button type="button" class="${cls}" data-date="${iso}" ${clickable ? '' : 'disabled'}>${day}</button>`;
    }

    return `
      <div class="journal-cal-month">
        <div class="journal-cal-month-title">${escapeHtml(monthName)}</div>
        <div class="journal-cal-weekdays">${weekdayLabels.map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="journal-cal-grid">${cells}</div>
      </div>
    `;
  }).join('');

  historyCalendar.querySelectorAll('.journal-cal-cell--has-entry').forEach((btn) => {
    btn.addEventListener('click', () => {
      const iso = btn.dataset.date;
      selectedCalendarDate = iso;
      historyCalendar.querySelectorAll('.journal-cal-cell--selected').forEach((el) => {
        el.classList.remove('journal-cal-cell--selected');
      });
      btn.classList.add('journal-cal-cell--selected');

      if (iso === state.today) {
        closePastEditor();
        todayCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      openPastEntryEditor(entriesByDate[iso]);
    });
  });

  if (selectedCalendarDate && selectedCalendarDate !== state.today && entriesByDate[selectedCalendarDate]) {
    openPastEntryEditor(entriesByDate[selectedCalendarDate]);
  } else if (selectedCalendarDate === state.today) {
    closePastEditor();
  }
}

journalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formMessage.hidden = true;

  if (!canEditToday()) return;

  const answers = collectAnswersFrom(questionsContainer, state.questions);
  await saveEntry(state.today, answers, formMessage, submitBtn);
});

async function loadJournal() {
  try {
    state = await apiFetch('/entries', {}, participantId);
    if (state.name) userLabel.textContent = state.name;
    renderProgress(state.progress, state.history);
    renderTodayForm();
    renderCalendar(state.questions, state.history, state.progress);
  } catch (err) {
    showMessage(formMessage, err.message || 'Could not load journal');
  }
}
