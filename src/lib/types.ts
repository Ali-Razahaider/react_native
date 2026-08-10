export type Book = {
  id: string;
  title: string;
  fileName: string;
  uri: string;
  size: number;
  addedAt: number;
  lastPage: number;
  totalPages?: number;
};
