import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

import pdfJsModule from '@/assets/pdfjs/pdf.min.js.txt';
import pdfWorkerModule from '@/assets/pdfjs/pdf.worker.min.js.txt';

type PdfAssets = {
  pdfJsSource: string;
  workerBase64: string;
};

let cached: PdfAssets | null = null;

export async function loadPdfAssets(): Promise<PdfAssets> {
  if (cached) return cached;

  const pdfJs = Asset.fromModule(pdfJsModule);
  const worker = Asset.fromModule(pdfWorkerModule);
  await Promise.all([pdfJs.downloadAsync(), worker.downloadAsync()]);

  const pdfJsSource = await FileSystem.readAsStringAsync(pdfJs.localUri!);
  const workerBase64 = await FileSystem.readAsStringAsync(worker.localUri!, {
    encoding: FileSystem.EncodingType.Base64,
  });

  cached = { pdfJsSource, workerBase64 };
  return cached;
}
