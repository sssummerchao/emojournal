import {
  QUESTIONS,
  getStudyEndDate,
  parseDate,
  shouldSkipRest,
  isQuestionVisible,
} from './_config.js';

function isDateAfterStudyEnd(isoDate) {
  const end = parseDate(getStudyEndDate());
  const d = parseDate(isoDate);
  return d.getTime() > end.getTime();
}

function emptyAnswers() {
  const out = {};
  for (const q of QUESTIONS) {
    out[q.id] = '';
    if (q.type === 'select' && q.options?.some((o) => o.hasText)) out[`${q.id}_other`] = '';
    if (q.type === 'multiselect' && q.options?.some((o) => o.hasText)) out[`${q.id}_other`] = '';
  }
  return out;
}

function requiredError(q) {
  return { ok: false, error: `Please answer: ${q.label}` };
}

export function sanitizeAnswers(answers, date) {
  if (date && isDateAfterStudyEnd(date)) {
    return { ok: false, error: 'This date is after the study period.' };
  }

  if (!answers || typeof answers !== 'object') {
    return { ok: true, answers: emptyAnswers() };
  }

  const cleaned = emptyAnswers();
  const skipRest = shouldSkipRest(answers);

  for (const q of QUESTIONS) {
    if (skipRest && q.showWhen) {
      cleaned[q.id] = '';
      if (`${q.id}_other` in cleaned) cleaned[`${q.id}_other`] = '';
      continue;
    }

    if (!isQuestionVisible(q, answers)) {
      cleaned[q.id] = '';
      if (`${q.id}_other` in cleaned) cleaned[`${q.id}_other`] = '';
      continue;
    }

    const raw = answers[q.id];
    if (raw == null || String(raw).trim() === '') {
      return requiredError(q);
    } else if (q.type === 'yesno') {
      const val = String(raw).toLowerCase();
      if (val !== 'yes' && val !== 'no') {
        return { ok: false, error: `${q.label} must be Yes or No.` };
      }
      cleaned[q.id] = val;
    } else if (q.type === 'select') {
      const val = String(raw);
      const valid = q.options?.some((o) => o.value === val);
      if (!valid) {
        return { ok: false, error: `Invalid selection for: ${q.label}` };
      }
      cleaned[q.id] = val;
      if (q.options?.some((o) => o.hasText)) {
        const otherText = String(answers[`${q.id}_other`] || '').trim().slice(0, 5000);
        if (q.options.find((o) => o.value === val)?.hasText && !otherText) {
          return { ok: false, error: `Please describe: ${q.label}` };
        }
        cleaned[`${q.id}_other`] = otherText;
      }
    } else if (q.type === 'multiselect') {
      let selected = [];
      try {
        selected = JSON.parse(raw);
      } catch {
        return { ok: false, error: `Invalid selection for: ${q.label}` };
      }
      if (!Array.isArray(selected)) {
        return { ok: false, error: `Invalid selection for: ${q.label}` };
      }
      const validValues = new Set(q.options?.map((o) => o.value) || []);
      if (!selected.every((v) => validValues.has(v))) {
        return { ok: false, error: `Invalid selection for: ${q.label}` };
      }
      cleaned[q.id] = JSON.stringify(selected);
      if (q.options?.some((o) => o.hasText)) {
        const otherText = String(answers[`${q.id}_other`] || '').trim().slice(0, 5000);
        if (selected.includes('other') && !otherText) {
          return { ok: false, error: `Please describe: ${q.label}` };
        }
        cleaned[`${q.id}_other`] = otherText;
      }
    } else {
      cleaned[q.id] = String(raw).trim().slice(0, 5000);
    }
  }

  return { ok: true, answers: cleaned };
}
