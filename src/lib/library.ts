import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { type Book } from '@/lib/types';
import { deleteProgress } from '@/lib/progress-db';

const isWeb = Platform.OS === 'web';

type IndexFile = Record<string, Book>;

function booksUri(): string {
  return `${FileSystem.documentDirectory}books/`;
}

async function ensureBooksDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(booksUri());
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(booksUri(), { intermediates: true });
  }
}

async function loadIndex(): Promise<IndexFile> {
  if (isWeb) return {};
  try {
    const info = await FileSystem.getInfoAsync(`${booksUri()}index.json`);
    if (!info.exists) return {};
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(`${booksUri()}index.json`));
    if (parsed && typeof parsed === 'object') return parsed as IndexFile;
  } catch {
    // Corrupt index: start fresh rather than crash.
  }
  return {};
}

async function saveIndex(index: IndexFile): Promise<void> {
  if (isWeb) return;
  try {
    await FileSystem.writeAsStringAsync(`${booksUri()}index.json`, JSON.stringify(index));
  } catch {
    // Non-critical: never crash the app because metadata failed to save.
  }
}

export async function listBooks(): Promise<Book[]> {
  const index = await loadIndex();
  const cleaned: IndexFile = {};

  for (const book of Object.values(index)) {
    const info = await FileSystem.getInfoAsync(book.uri);
    if (!info.exists) continue; // File vanished: drop it from the index.
    cleaned[book.id] = book;
  }

  if (JSON.stringify(cleaned) !== JSON.stringify(index)) {
    await saveIndex(cleaned);
  }

  return Object.values(cleaned).sort((a, b) => b.addedAt - a.addedAt);
}

export async function getBook(id: string): Promise<Book | undefined> {
  return (await loadIndex())[id];
}

export async function updateBook(id: string, patch: Partial<Book>): Promise<Book | undefined> {
  const index = await loadIndex();
  const book = index[id];
  if (!book) return undefined;
  index[id] = { ...book, ...patch };
  await saveIndex(index);
  return index[id];
}

export async function importBook(picked: {
  uri: string;
  name: string;
  size: number;
}): Promise<Book | null> {
  if (isWeb) return null;

  await ensureBooksDir();

  const lastDot = picked.name.lastIndexOf('.');
  const ext = lastDot > 0 ? picked.name.slice(lastDot) : '.pdf';
  const baseName = lastDot > 0 ? picked.name.slice(0, lastDot) : 'book';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const to = `${booksUri()}${uniqueName}`;

  await FileSystem.copyAsync({ from: picked.uri, to });

  const book: Book = {
    id: uniqueName.replace(/\.[^.]+$/, ''),
    title: baseName,
    fileName: uniqueName,
    uri: to,
    size: picked.size,
    addedAt: Date.now(),
    lastPage: 0,
  };

  const index = await loadIndex();
  index[book.id] = book;
  await saveIndex(index);

  return book;
}

// Remove a book from the app's library index (and saved progress) but keep
// the underlying file on disk, so it can be re-imported later.
export async function removeBookFromLibrary(id: string): Promise<boolean> {
  if (isWeb) return false;

  const index = await loadIndex();
  if (!index[id]) return false;

  delete index[id];
  await saveIndex(index);
  try {
    await deleteProgress(id);
  } catch {
    // Ignore progress cleanup errors.
  }
  return true;
}

// Permanently delete a book: removes the file from disk, the library index,
// and any saved progress.
export async function deleteBook(id: string): Promise<boolean> {
  if (isWeb) return false;

  const index = await loadIndex();
  const book = index[id];
  if (!book) return false;

  try {
    await FileSystem.deleteAsync(book.uri, { idempotent: true });
  } catch {
    // Ignore file deletion errors; still remove from the index below.
  }

  delete index[id];
  await saveIndex(index);
  try {
    await deleteProgress(id);
  } catch {
    // Ignore progress cleanup errors.
  }
  return true;
}
