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
const timelineStrip = document.getElementById('timeline-strip');
const timelinePrev = document.getElementById('timeline-prev');
const timelineNext = document.getElementById('timeline-next');
const entryDateLabel = document.getElementById('entry-date-label');
const questionsContainer = document.getElementById('questions-container');
const userLabel = document.getElementById('user-label');

const VISIBLE_DAYS = 7;

const participantId = getParticipantId();
let state = null;
let selectedDate = null;
let timelineWindowStart = 0;
let studyDates = [];

if (!participantId) {
  document.body.innerHTML = '<p style="padding:24px;">Invalid journal link.</p>';
} else {
  loadJournal();
}

let messageTimer = null;

function showMessage(el, text, type = 'error', autoHideMs = 0) {
  if (messageTimer) {
    clearTimeout(messageTimer);
    messageTimer = null;
  }

  el.hidden = false;
  el.className = type === 'success' ? 'journal-form-message journal-success' : 'journal-form-message journal-error';
  el.textContent = text;

  if (autoHideMs > 0) {
    messageTimer = setTimeout(() => {
      el.hidden = true;
      messageTimer = null;
    }, autoHideMs);
  }
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

function getStudyDates(progress) {
  const dates = [];
  const start = parseIsoDate(progress.entryStartDate || progress.studyStartDate);
  const end = parseIsoDate(progress.studyEndDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(toIsoDate(new Date(d)));
  }
  return dates;
}

function getStudyDay(iso) {
  const fromHistory = state?.history.find((h) => h.date === iso)?.studyDay;
  if (fromHistory != null) return fromHistory;

  if (!state?.progress?.studyStartDate) return null;
  const start = parseIsoDate(state.progress.studyStartDate);
  const current = parseIsoDate(iso);
  const day = Math.floor((current - start) / 86400000) + 1;
  if (day < 1 || day > state.progress.studyDurationDays) return null;
  return day;
}

function getEntryForDate(iso) {
  if (iso === state.today && state.todayEntry) return state.todayEntry;
  return state.history.find((h) => h.date === iso) || null;
}

function canEditDate(isoDate) {
  if (!state?.today || !isoDate) return false;
  const entryStart = state.progress.entryStartDate || state.progress.studyStartDate;
  if (isoDate < entryStart) return false;
  if (isoDate > state.today) return false;
  if (isoDate > state.progress.studyEndDate) return false;
  return true;
}

function canEditSelected() {
  return canEditDate(selectedDate);
}

function formatTimelineWeekday(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
}

function formatTimelineMonthDay(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getWeekStartIndex(dateIndex) {
  return Math.floor(dateIndex / VISIBLE_DAYS) * VISIBLE_DAYS;
}

function getMaxWeekStart() {
  if (!studyDates.length) return 0;
  return getWeekStartIndex(studyDates.length - 1);
}

function ensureDateVisible(iso) {
  const idx = studyDates.indexOf(iso);
  if (idx < 0) return;
  timelineWindowStart = getWeekStartIndex(idx);
}

function updateSubmittedBanner() {
  if (!submittedBanner) return;
  const entry = getEntryForDate(selectedDate);
  if (entry && hasAnswers(entry.answers)) {
    submittedBanner.hidden = false;
    const label = selectedDate === state.today ? "today's entry" : 'this entry';
    submittedBanner.textContent = `You already submitted ${label}. You can update your answers below.`;
  } else {
    submittedBanner.hidden = true;
  }
}

function updateSubmitLabel() {
  if (!submitBtn) return;
  const entry = getEntryForDate(selectedDate);
  const hasSubmitted = entry && hasAnswers(entry.answers);
  submitBtn.textContent = hasSubmitted ? 'Update entry' : 'Submit';
  submitBtn.disabled = !canEditSelected();
}

function updateEntryDateLabel() {
  if (!entryDateLabel) return;
  const dayNum = getStudyDay(selectedDate);
  const dayLabel = dayNum ? `Day ${dayNum} · ` : '';
  entryDateLabel.textContent = `${dayLabel}${formatDateLabel(selectedDate)}`;
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

function renderEntryForm() {
  const entry = getEntryForDate(selectedDate);
  renderFormInto(
    questionsContainer,
    state.questions,
    entry?.answers || {},
    canEditSelected(),
  );
  updateEntryDateLabel();
  updateSubmittedBanner();
  updateSubmitLabel();
}

function selectDate(iso) {
  if (!studyDates.includes(iso)) return;
  selectedDate = iso;
  formMessage.hidden = true;
  ensureDateVisible(iso);
  renderTimeline();
  renderEntryForm();
}

function renderTimeline() {
  if (!timelineStrip || !state) return;

  const entriesByDate = Object.fromEntries(
    state.history.filter((h) => hasAnswers(h.answers)).map((h) => [h.date, h]),
  );
  if (state.todayEntry && hasAnswers(state.todayEntry.answers)) {
    entriesByDate[state.today] = state.todayEntry;
  }

  const visible = studyDates.slice(timelineWindowStart, timelineWindowStart + VISIBLE_DAYS);

  timelineStrip.innerHTML = visible.map((iso) => {
    const d = parseIsoDate(iso);
    const dayNum = getStudyDay(iso);
    const isSelected = iso === selectedDate;
    const isToday = iso === state.today;
    const hasEntry = !!entriesByDate[iso];
    const isFuture = iso > state.today;

    let cls = 'journal-timeline-day';
    if (isSelected) cls += ' journal-timeline-day--selected';
    if (isToday) cls += ' journal-timeline-day--today';
    if (hasEntry) cls += ' journal-timeline-day--has-entry';
    if (isFuture) cls += ' journal-timeline-day--future';

    const weekday = formatTimelineWeekday(d);
    const monthDay = formatTimelineMonthDay(d);
    const statusLabel = hasEntry
      ? '<span class="journal-timeline-check" aria-hidden="true">✓</span>'
      : (dayNum ? `<span class="journal-timeline-study-day">D${dayNum}</span>` : '');

    return `
      <button type="button" class="${cls}" data-date="${iso}" aria-label="${escapeHtml(formatDateLabel(iso))}${hasEntry ? ' — entry completed' : ''}" aria-pressed="${isSelected}">
        <span class="journal-timeline-weekday">${escapeHtml(weekday)}</span>
        <span class="journal-timeline-date">${escapeHtml(monthDay)}</span>
        ${statusLabel}
      </button>
    `;
  }).join('');

  timelineStrip.querySelectorAll('.journal-timeline-day').forEach((btn) => {
    btn.addEventListener('click', () => selectDate(btn.dataset.date));
  });

  if (timelinePrev) {
    timelinePrev.disabled = timelineWindowStart <= 0;
  }
  if (timelineNext) {
    timelineNext.disabled = timelineWindowStart >= getMaxWeekStart();
  }
}

function shiftTimelineWeek(direction) {
  const maxStart = getMaxWeekStart();
  timelineWindowStart = Math.max(0, Math.min(maxStart, timelineWindowStart + direction * VISIBLE_DAYS));
  renderTimeline();
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

  if (date === state.today) {
    state.todayEntry = entry;
  }
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
    const studyDay = getStudyDay(date) ?? state.history.find((h) => h.date === date)?.studyDay ?? null;

    upsertHistoryRow(date, data.entry, studyDay);
    renderTimeline();
    renderEntryForm();

    showMessage(messageEl, date === state.today ? 'Entry submitted. Thank you!' : 'Entry updated.', 'success', 3000);
    return true;
  } catch (err) {
    showMessage(messageEl, err.message || 'Could not save entry');
    return false;
  } finally {
    if (canEditDate(date)) {
      submitButton.disabled = false;
    }
  }
}

timelinePrev?.addEventListener('click', () => shiftTimelineWeek(-1));
timelineNext?.addEventListener('click', () => shiftTimelineWeek(1));

journalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formMessage.hidden = true;

  if (!canEditSelected()) return;

  const answers = collectAnswersFrom(questionsContainer, state.questions);
  await saveEntry(selectedDate, answers, formMessage, submitBtn);
});

async function loadJournal() {
  try {
    state = await apiFetch('/entries', {}, participantId);
    if (state.name) userLabel.textContent = state.name;

    studyDates = getStudyDates(state.progress);
    selectedDate = state.today;
    ensureDateVisible(selectedDate);

    renderTimeline();
    renderEntryForm();
  } catch (err) {
    showMessage(formMessage, err.message || 'Could not load journal');
  }
}
