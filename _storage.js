import fs from 'fs/promises';
import path from 'path';

const KV_KEY = 'journal:data';

function useKv() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function dataFilePath() {
  return path.join(process.cwd(), 'journal', '.data', 'journal.json');
}

async function kvRequest(command, ...args) {
  const base = process.env.KV_REST_API_URL.replace(/\/$/, '');
  const token = process.env.KV_REST_API_TOKEN;
  const segments = [command, ...args.map((a) => encodeURIComponent(a))].join('/');
  const resp = await fetch(`${base}/${segments}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`KV request failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

async function readFromKv() {
  const data = await kvRequest('get', KV_KEY);
  if (data.result == null) return emptyStore();
  try {
    return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
  } catch {
    return emptyStore();
  }
}

async function writeToKv(store) {
  await kvRequest('set', KV_KEY, JSON.stringify(store));
}

async function readFromFile() {
  const filePath = dataFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return emptyStore();
    throw err;
  }
}

async function writeToFile(store) {
  const filePath = dataFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf8');
}

function emptyStore() {
  return { entries: {} };
}

export async function loadStore() {
  if (useKv()) return readFromKv();
  return readFromFile();
}

export async function saveStore(store) {
  if (useKv()) return writeToKv(store);
  return writeToFile(store);
}

export function getUserEntries(store, userId) {
  return store.entries[userId] || {};
}

export async function upsertEntry(userId, date, answers) {
  const store = await loadStore();
  if (!store.entries[userId]) store.entries[userId] = {};
  store.entries[userId][date] = {
    answers,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveStore(store);
  return store.entries[userId][date];
}

export async function getAllEntries() {
  const store = await loadStore();
  return store.entries;
}

export async function deleteEntry(userId, date) {
  const store = await loadStore();
  if (!store.entries[userId]?.[date]) return false;
  delete store.entries[userId][date];
  if (Object.keys(store.entries[userId]).length === 0) {
    delete store.entries[userId];
  }
  await saveStore(store);
  return true;
}
