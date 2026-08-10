import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { type Book } from '@/lib/types';

const isWeb = Platform.OS === 'web';

type IndexFile = Record<string, Book>;

function getBooksDir(): Directory {
  const dir = new Directory(Paths.document, 'books');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function getIndexFile(): File {
  return new File(getBooksDir(), 'index.json');
}

function loadIndex(): IndexFile {
  if (isWeb) return {};
  try {
    const file = getIndexFile();
    if (!file.exists) return {};
    const parsed = JSON.parse(file.textSync());
    if (parsed && typeof parsed === 'object') return parsed as IndexFile;
  } catch {
    // Corrupt index: start fresh rather than crash.
  }
  return {};
}

function saveIndex(index: IndexFile) {
  if (isWeb) return;
  try {
    const file = getIndexFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(index));
  } catch {
    // Non-critical: never crash the app because metadata failed to save.
  }
}

export function listBooks(): Book[] {
  const index = loadIndex();
  const dir = getBooksDir();
  const cleaned: IndexFile = {};

  const books = Object.values(index).sort((a, b) => b.addedAt - a.addedAt);
  for (const book of books) {
    const stored = new File(dir, book.fileName);
    if (!stored.exists) continue; // File vanished: drop it from the index.
    cleaned[book.id] = book;
  }

  const serialized = JSON.stringify(cleaned);
  if (serialized !== JSON.stringify(index)) {
    saveIndex(cleaned);
  }

  return Object.values(cleaned).sort((a, b) => b.addedAt - a.addedAt);
}

export function getBook(id: string): Book | undefined {
  return loadIndex()[id];
}

export function updateBook(id: string, patch: Partial<Book>): Book | undefined {
  const index = loadIndex();
  const book = index[id];
  if (!book) return undefined;
  index[id] = { ...book, ...patch };
  saveIndex(index);
  return index[id];
}

export function importBook(picked: { uri: string; name: string; size: number }): Book | null {
  if (isWeb) return null;

  const parsed = Paths.parse(picked.name);
  const ext = parsed.ext || '.pdf';
  const baseName = parsed.name || 'book';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  const dir = getBooksDir();
  const dest = new File(dir, uniqueName);
  try {
    new File(picked.uri).copySync(dest);
  } catch {
    return null;
  }

  const id = Paths.parse(uniqueName).name;
  const book: Book = {
    id,
    title: baseName,
    fileName: uniqueName,
    uri: dest.uri,
    size: picked.size,
    addedAt: Date.now(),
    lastPage: 0,
  };

  const index = loadIndex();
  index[id] = book;
  saveIndex(index);

  return book;
}

export function deleteBook(id: string): boolean {
  if (isWeb) return false;

  const index = loadIndex();
  const book = index[id];
  if (!book) return false;

  try {
    const file = new File(book.uri);
    if (file.exists) file.delete();
  } catch {
    // Ignore file deletion errors; still remove from the index below.
  }

  delete index[id];
  saveIndex(index);
  return true;
}
