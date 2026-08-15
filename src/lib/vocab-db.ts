import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'reader.db';

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DATABASE_NAME);
    db.execSync(
      `CREATE TABLE IF NOT EXISTS vocab_words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        definition TEXT,
        part_of_speech TEXT,
        learned_at INTEGER NOT NULL
      );`
    );
  }
  return db;
}

export type LearnedWord = {
  word: string;
  definition: string | null;
  partOfSpeech: string | null;
  learnedAt: number;
};

function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Monday-based week key (YYYY-MM-DD of the week's Monday).
function weekKey(ts: number): string {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 = Sunday
  const diffToMonday = (dow + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return dayKey(d.getTime());
}

function keyToDay(key: string): number {
  return new Date(`${key}T00:00:00`).getTime();
}

// Record a successfully looked-up word (idempotent per word, refreshes
// learned_at so re-searching a word bumps it to the top of the list).
export async function recordWordLearned(
  word: string,
  definition?: string,
  partOfSpeech?: string,
): Promise<void> {
  const existing = await getDb().getAllAsync<{ id: number }>(
    'SELECT id FROM vocab_words WHERE word = ?',
    word,
  );
  const now = Date.now();
  if (existing.length > 0) {
    await getDb().runAsync(
      `UPDATE vocab_words
       SET learned_at = ?, definition = ?, part_of_speech = ?
       WHERE word = ?`,
      now,
      definition ?? null,
      partOfSpeech ?? null,
      word,
    );
  } else {
    await getDb().runAsync(
      `INSERT INTO vocab_words (word, definition, part_of_speech, learned_at)
       VALUES (?, ?, ?, ?)`,
      word,
      definition ?? null,
      partOfSpeech ?? null,
      now,
    );
  }
}

export async function getLearnedWords(): Promise<LearnedWord[]> {
  const rows = await getDb().getAllAsync<{
    word: string;
    definition: string | null;
    part_of_speech: string | null;
    learned_at: number;
  }>('SELECT word, definition, part_of_speech, learned_at FROM vocab_words ORDER BY learned_at DESC');
  return rows.map((r) => ({
    word: r.word,
    definition: r.definition,
    partOfSpeech: r.part_of_speech,
    learnedAt: r.learned_at,
  }));
}

export async function getLearnedWordCountThisWeek(): Promise<number> {
  const thisWeekStart = keyToDay(weekKey(Date.now()));
  const row = await getDb().getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM vocab_words WHERE learned_at >= ?',
    thisWeekStart,
  );
  return row?.count ?? 0;
}

// Group learned words into sections keyed by week (Monday-based), newest first,
// plus a final "Earlier" bucket.
export async function getLearnedWordsByWeek(): Promise<{ label: string; words: LearnedWord[] }[]> {
  const words = await getLearnedWords();
  const thisWeekKey = weekKey(Date.now());
  const sections = new Map<string, LearnedWord[]>();
  let earlier: LearnedWord[] = [];

  for (const w of words) {
    const wk = weekKey(w.learnedAt);
    const weeksAgo = Math.round((keyToDay(thisWeekKey) - keyToDay(wk)) / (7 * 86400000));
    if (weeksAgo === 0) {
      sections.set('This week', [...(sections.get('This week') ?? []), w]);
    } else if (weeksAgo === 1) {
      sections.set('Last week', [...(sections.get('Last week') ?? []), w]);
    } else {
      earlier.push(w);
    }
  }

  const result: { label: string; words: LearnedWord[] }[] = [];
  for (const label of ['This week', 'Last week']) {
    const ws = sections.get(label);
    if (ws && ws.length > 0) result.push({ label, words: ws });
  }
  if (earlier.length > 0) result.push({ label: 'Earlier', words: earlier });
  return result;
}

export async function deleteAllLearnedWords(): Promise<void> {
  await getDb().runAsync('DELETE FROM vocab_words');
}