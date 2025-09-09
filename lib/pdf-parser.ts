export interface ParsedPDF {
  text: string
  pages: number
  info?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  try {
    // Dynamic import to avoid build-time issues
    const pdf = await import('pdf-parse')
    const data = await pdf.default(buffer)
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info,
      metadata: data.metadata
    }
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function extractInvoiceDetails(text: string): string {
  // Return all extracted text without filtering - let the LLM decide what's relevant
  return text
}
