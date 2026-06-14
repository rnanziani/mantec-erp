/**
 * Alias relajado para definiciones PDF.
 * pdfmake en runtime acepta objetos dinámicos; los tipos oficiales son demasiado estrictos para tsc en CI.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PdfDocumentDefinition = any;
