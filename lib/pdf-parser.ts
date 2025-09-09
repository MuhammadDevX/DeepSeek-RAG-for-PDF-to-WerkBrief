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
  // Extract relevant invoice information from PDF text
  // This function can be enhanced with more sophisticated parsing logic

  // Look for common invoice patterns
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  // Extract product-related information
  const productLines = lines.filter(line =>
    // Look for lines that might contain product information
    /^\d+/.test(line) || // Lines starting with numbers (item numbers)
    /[a-zA-Z]{3,}/.test(line) || // Lines with meaningful text
    /kg|pcs|ctn|box|piece/i.test(line) || // Lines with quantity indicators
    /\d+\.\d+/.test(line) // Lines with decimal numbers (prices/weights)
  )

  return productLines.join('\n')
}
