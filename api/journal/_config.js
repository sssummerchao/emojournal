/**
 * Journal study configuration.
 * Edit QUESTIONS here, or override study dates via env vars on Vercel.
 */

export const STUDY_DURATION_DAYS = parseInt(process.env.JOURNAL_STUDY_DAYS || '32', 10);

/** Study period: Jul 7 – Aug 7, 2026 (inclusive). */
export const STUDY_START_DATE =
  process.env.JOURNAL_STUDY_START_DATE || '2026-07-07';

/** Earliest date participants can submit entries (includes pre-study days). */
export const ENTRY_START_DATE =
  process.env.JOURNAL_ENTRY_START_DATE || '2026-07-02';

/**
 * Daily questions — same every day.
 * Types: text, textarea, yesno, select, multiselect, scale
 * showWhen: { questionId, value } or { questionId, values: [...] }
 */
export const QUESTIONS = [
  {
    id: 'device_used',
    label: 'Did you use the device today?',
    type: 'yesno',
    skipRestWhen: 'no',
  },
  {
    id: 'send_count',
    label: 'Approximately how many times did you send an emotion today?',
    type: 'text',
    placeholder: 'e.g. 3',
    showWhen: { questionId: 'device_used', value: 'yes' },
  },
  {
    id: 'emotion_sent',
    label: 'Which emotion did you send today?',
    type: 'select',
    showWhen: { questionId: 'device_used', value: 'yes' },
    options: [
      { value: 'positive', label: 'Positive' },
      { value: 'negative', label: 'Negative' },
      { value: 'both', label: 'Both' },
      { value: 'neither', label: 'Neither' },
    ],
  },
  {
    id: 'send_reason',
    label: 'What is the reason to send emotion?',
    type: 'multiselect',
    showWhen: { questionId: 'device_used', value: 'yes' },
    options: [
      { value: 'genuine_feeling', label: 'I wanted to share how I was genuinely feeling' },
      { value: 'care_support', label: 'I wanted to show care or support for my partner' },
      { value: 'home_present', label: 'I wanted to signal that I was home / present' },
      { value: 'responding_partner', label: "I was responding to my partner's emotion" },
      { value: 'habit', label: 'Out of habit or routine' },
      { value: 'other', label: 'Other', hasText: true },
    ],
  },
  {
    id: 'after_send_positive',
    label: 'After sending a positive emotion today, what happened?',
    type: 'multiselect',
    showWhen: { questionId: 'emotion_sent', values: ['positive', 'both'] },
    options: [
      { value: 'relieved', label: 'I felt relieved' },
      { value: 'reflected', label: 'I reflected on my emotions' },
      { value: 'hoped_response', label: 'I hoped my partner would respond' },
      { value: 'more_connected', label: 'I felt more connected to my partner' },
      { value: 'nothing_changed', label: 'Nothing changed' },
      { value: 'other', label: 'Other', hasText: true },
    ],
  },
  {
    id: 'after_send_negative',
    label: 'After sending a negative emotion today, what happened?',
    type: 'multiselect',
    showWhen: { questionId: 'emotion_sent', values: ['negative', 'both'] },
    options: [
      { value: 'relieved', label: 'I felt relieved' },
      { value: 'reflected', label: 'I reflected on my emotions' },
      { value: 'hoped_response', label: 'I hoped my partner would respond' },
      { value: 'more_connected', label: 'I felt more connected to my partner' },
      { value: 'nothing_changed', label: 'Nothing changed' },
      { value: 'other', label: 'Other', hasText: true },
    ],
  },
  {
    id: 'emotion_received',
    label: 'Which emotion did you receive today?',
    type: 'select',
    showWhen: { questionId: 'device_used', value: 'yes' },
    options: [
      { value: 'positive', label: 'Positive' },
      { value: 'negative', label: 'Negative' },
      { value: 'both', label: 'Both' },
      { value: 'neither', label: 'Neither' },
    ],
  },
  {
    id: 'after_receive_positive',
    label: 'After receiving a positive emotion today, what happened?',
    type: 'multiselect',
    showWhen: { questionId: 'emotion_received', values: ['positive', 'both'] },
    options: [
      { value: 'thought_partner', label: 'I thought about my partner' },
      { value: 'wanted_check_in', label: 'I wanted to check in' },
      { value: 'changed_activity', label: 'I changed what I was doing and do something else' },
      { value: 'reflected', label: 'I reflected on my own emotions' },
      { value: 'more_connected', label: 'I felt more connected to my partner' },
      { value: 'nothing_changed', label: 'Nothing changed' },
      { value: 'other', label: 'Other', hasText: true },
    ],
  },
  {
    id: 'after_receive_negative',
    label: 'After receiving a negative emotion today, what happened?',
    type: 'multiselect',
    showWhen: { questionId: 'emotion_received', values: ['negative', 'both'] },
    options: [
      { value: 'thought_partner', label: 'I thought about my partner' },
      { value: 'wanted_check_in', label: 'I wanted to check in' },
      { value: 'changed_activity', label: 'I changed what I was doing and do something else' },
      { value: 'reflected', label: 'I reflected on my own emotions' },
      { value: 'more_connected', label: 'I felt more connected to my partner' },
      { value: 'nothing_changed', label: 'Nothing changed' },
      { value: 'other', label: 'Other', hasText: true },
    ],
  },
  {
    id: 'greater_impact',
    label: 'Overall, which emotion had the greater impact on you today?',
    type: 'select',
    showWhen: { questionId: 'device_used', value: 'yes' },
    options: [
      { value: 'positive', label: 'Positive' },
      { value: 'negative', label: 'Negative' },
      { value: 'both_equally', label: 'Both equally' },
      { value: 'neither', label: 'Neither' },
    ],
  },
  {
    id: 'connected_likert',
    label: "Today's interaction made me feel emotionally connected to my partner.",
    type: 'scale',
    min: 1,
    max: 7,
    showWhen: { questionId: 'device_used', value: 'yes' },
  },
  {
    id: 'withheld_emotion',
    label: 'Was there an emotion you wanted to send today but decided not to?',
    type: 'select',
    showWhen: { questionId: 'device_used', value: 'yes' },
    options: [
      { value: 'positive', label: 'Positive' },
      { value: 'negative', label: 'Negative' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    id: 'withheld_reason',
    label: 'What made you decide not to?',
    type: 'text',
    placeholder: 'Please describe',
    showWhen: { questionId: 'withheld_emotion', values: ['positive', 'negative'] },
  },
  {
    id: 'memorable',
    label: "Was there anything memorable, unexpected, or meaningful about today's interaction? Please describe.",
    type: 'textarea',
    showWhen: { questionId: 'device_used', value: 'yes' },
    placeholder: 'Please describe',
  },
];

function participant(id, name) {
  return { id, name };
}

/** Four participants — each has their own URL (p1.html … p4.html). */
export const PARTICIPANTS = [
  participant('p1', 'Participant 1'),
  participant('p2', 'Participant 2'),
  participant('p3', 'Participant 3'),
  participant('p4', 'Participant 4'),
];

export function getParticipantById(id) {
  return PARTICIPANTS.find((p) => p.id === id) || null;
}

export function isQuestionVisible(q, answers) {
  if (!q.showWhen) return true;
  const parent = answers?.[q.showWhen.questionId];
  if (q.showWhen.values) {
    return q.showWhen.values.includes(parent);
  }
  return parent === q.showWhen.value;
}

export function shouldSkipRest(answers) {
  const gate = QUESTIONS.find((q) => q.skipRestWhen);
  if (!gate) return false;
  return answers?.[gate.id] === gate.skipRestWhen;
}

export function getOptionLabel(q, value) {
  const opt = q.options?.find((o) => o.value === value);
  return opt?.label || value;
}

export function formatAnswerForDisplay(q, value, answers = {}) {
  if (value == null || String(value).trim() === '') return '';

  if (q.type === 'yesno') {
    return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value;
  }

  if (q.type === 'select') {
    if (value === 'other') {
      const other = answers[`${q.id}_other`] || '';
      return other ? `Other: ${other}` : 'Other';
    }
    return getOptionLabel(q, value);
  }

  if (q.type === 'multiselect') {
    let selected = [];
    try {
      selected = JSON.parse(value);
    } catch {
      selected = String(value).split(',').filter(Boolean);
    }
    if (!Array.isArray(selected) || !selected.length) return '';
    return selected
      .map((v) => {
        if (v === 'other') {
          const other = answers[`${q.id}_other`] || '';
          return other ? `Other: ${other}` : 'Other';
        }
        return getOptionLabel(q, v);
      })
      .join('; ');
  }

  if (q.type === 'scale') {
    return String(value);
  }

  return String(value);
}

export function getStudyEndDate() {
  const start = parseDate(STUDY_START_DATE);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + STUDY_DURATION_DAYS - 1);
  return formatDate(end);
}

export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getStudyDayForDate(isoDate) {
  const start = parseDate(STUDY_START_DATE);
  const current = parseDate(isoDate);
  const diffMs = current.getTime() - start.getTime();
  const day = Math.floor(diffMs / 86400000) + 1;
  if (day < 1 || day > STUDY_DURATION_DAYS) return null;
  return day;
}

export function formatDateInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

export function getStudyTimeZone() {
  return process.env.JOURNAL_TIMEZONE || 'America/New_York';
}

export function getTodayIso() {
  return formatDateInTimeZone(new Date(), getStudyTimeZone());
}

export function getStudyProgress(isoDate = getTodayIso()) {
  const endDate = getStudyEndDate();
  const day = getStudyDayForDate(isoDate);
  const start = parseDate(STUDY_START_DATE);
  const end = parseDate(endDate);
  const today = parseDate(isoDate);

  let daysRemaining = 0;
  if (today.getTime() <= end.getTime()) {
    daysRemaining = Math.floor((end.getTime() - today.getTime()) / 86400000) + 1;
  }

  let status = 'active';
  if (today.getTime() < start.getTime()) status = 'not_started';
  else if (today.getTime() > end.getTime()) status = 'ended';

  return {
    studyStartDate: STUDY_START_DATE,
    entryStartDate: ENTRY_START_DATE,
    studyEndDate: endDate,
    studyDurationDays: STUDY_DURATION_DAYS,
    today: isoDate,
    currentDay: day,
    daysRemaining,
    status,
  };
}

export function getPublicConfig() {
  return {
    questions: QUESTIONS,
    studyStartDate: STUDY_START_DATE,
    entryStartDate: ENTRY_START_DATE,
    studyEndDate: getStudyEndDate(),
    studyDurationDays: STUDY_DURATION_DAYS,
    participants: PARTICIPANTS.map((p) => ({ id: p.id, name: p.name })),
  };
}
