import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'reader.db';

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DATABASE_NAME);
    db.execSync(
      `CREATE TABLE IF NOT EXISTS progress (
        book_id TEXT PRIMARY KEY NOT NULL,
        last_page INTEGER NOT NULL DEFAULT 0,
        total_pages INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );`
    );
  }
  return db;
}

export type BookProgress = {
  bookId: string;
  lastPage: number;
  totalPages: number;
  updatedAt: number;
};

export async function getProgress(bookId: string): Promise<BookProgress | null> {
  const row = await getDb().getFirstAsync<{
    book_id: string;
    last_page: number;
    total_pages: number;
    updated_at: number;
  }>('SELECT * FROM progress WHERE book_id = ?', bookId);
  if (!row) return null;
  return {
    bookId: row.book_id,
    lastPage: row.last_page,
    totalPages: row.total_pages,
    updatedAt: row.updated_at,
  };
}

export async function saveProgress(
  bookId: string,
  lastPage: number,
  totalPages: number,
): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO progress (book_id, last_page, total_pages, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(book_id) DO UPDATE SET
       last_page = excluded.last_page,
       total_pages = excluded.total_pages,
       updated_at = excluded.updated_at`,
    bookId,
    lastPage,
    totalPages,
    Date.now(),
  );
}
