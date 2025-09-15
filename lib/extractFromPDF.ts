import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined' && 'Worker' in window) {
  // Use the public path so Next serves it from /public
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ') + '\n';
  }
  return text;
};

// Server-side: parse PDF text from a Buffer without using a worker
export const extractTextFromPDFBuffer = async (buffer: Buffer): Promise<string> => {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
  });

  const pdf = await loadingTask.promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ') + '\n';
  }
  return text.trim();
};