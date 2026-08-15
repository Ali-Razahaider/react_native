import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'reader.db';

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DATABASE_NAME);
    db.execSync(
      `CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        start_page INTEGER NOT NULL,
        end_page INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS book_finishes (
        book_id TEXT PRIMARY KEY NOT NULL,
        finished_at INTEGER NOT NULL
      );`
    );
  }
  return db;
}

export type ReadingSession = {
  id: number;
  bookId: string;
  startedAt: number;
  endedAt?: number;
  startPage: number;
  endPage: number;
};

export type ReadingStats = {
  streakDays: number;
  minutesToday: number;
  weekMinutes: number[];
};

export async function startSession(
  bookId: string,
  startPage: number,
): Promise<number> {
  const result = await getDb().runAsync(
    `INSERT INTO sessions (book_id, started_at, end_page, start_page)
     VALUES (?, ?, ?, ?)`,
    bookId,
    Date.now(),
    0,
    startPage,
  );
  return result.lastInsertRowId;
}

export async function endSession(id: number, endPage: number): Promise<void> {
  await getDb().runAsync(
    'UPDATE sessions SET ended_at = ?, end_page = ? WHERE id = ?',
    Date.now(),
    endPage,
    id,
  );
}

// Record that a book was read to its final page (idempotent per book).
export async function recordBookFinish(bookId: string): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO book_finishes (book_id, finished_at) VALUES (?, ?)
     ON CONFLICT(book_id) DO NOTHING`,
    bookId,
    Date.now(),
  );
}

export async function deleteStatsForBook(bookId: string): Promise<void> {
  await getDb().runAsync('DELETE FROM sessions WHERE book_id = ?', bookId);
  await getDb().runAsync('DELETE FROM book_finishes WHERE book_id = ?', bookId);
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function keyToDay(key: string): number {
  return new Date(`${key}T00:00:00`).getTime();
}

function addDays(day: number, delta: number): number {
  return day + delta * 86400000;
}

export async function getReadingStats(): Promise<ReadingStats> {
  const now = Date.now();
  const todayKey = dayKey(now);

  // ---- Sessions that ended today (they represent actual reading time).
  const sessions = await getDb().getAllAsync<{
    started_at: number;
    ended_at: number;
  }>(
    'SELECT started_at, ended_at FROM sessions WHERE ended_at IS NOT NULL',
  );

  let minutesToday = 0;
  const days = new Set<string>();
  const weekMinutes = new Array<number>(7).fill(0);

  for (const s of sessions) {
    const day = dayKey(s.started_at);
    days.add(day);
    const mins = Math.max(0, s.ended_at - s.started_at) / 60000;
    if (day === todayKey) {
      minutesToday += mins;
    }
    // Spread the session's minutes across the last 7 day buckets.
    const dayStart = keyToDay(day);
    const todayStart = keyToDay(todayKey);
    const idx = Math.round((dayStart - todayStart) / 86400000) + 6;
    if (idx >= 0 && idx < 7) {
      weekMinutes[idx] += mins;
    }
  }

  // ---- Streak: consecutive days (ending today, or yesterday if today has no
  // reading yet) that contain at least one session.
  let streak = 0;
  let cursor = keyToDay(todayKey);
  if (!days.has(todayKey)) {
    cursor = addDays(cursor, -1);
  }
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    streakDays: streak,
    minutesToday: Math.round(minutesToday),
    weekMinutes: weekMinutes.map((m) => Math.round(m)),
  };
}