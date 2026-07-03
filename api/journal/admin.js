import {
  QUESTIONS,
  PARTICIPANTS,
  getPublicConfig,
  getStudyDayForDate,
  getStudyProgress,
} from './_config.js';
import { getAllEntries } from './_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const allEntries = await getAllEntries();
  const config = getPublicConfig();
  const progress = getStudyProgress();

  const participants = PARTICIPANTS.map((p) => {
    const userEntries = allEntries[p.id] || {};
    const dates = Object.keys(userEntries).sort();
    const rows = dates.map((date) => ({
      date,
      studyDay: getStudyDayForDate(date),
      answers: userEntries[date].answers,
      submittedAt: userEntries[date].submittedAt,
    }));

    return {
      id: p.id,
      name: p.name,
      entryCount: dates.length,
      rows,
    };
  });

  return res.status(200).json({
    config,
    progress,
    questions: QUESTIONS,
    participants,
  });
}
