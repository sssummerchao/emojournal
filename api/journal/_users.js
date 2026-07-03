import { getParticipantById } from './_config.js';

export function resolveUserId(query) {
  const userId = query?.user || query?.userId;
  if (!userId || !getParticipantById(userId)) return null;
  return userId;
}

export function requireParticipant(req, res) {
  const userId = resolveUserId(req.query);
  if (!userId) {
    res.status(400).json({ error: 'Invalid participant.' });
    return null;
  }
  return userId;
}
