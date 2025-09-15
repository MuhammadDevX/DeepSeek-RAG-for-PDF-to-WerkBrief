export { }

// Create a type for the roles
export type Roles = 'admin' | 'moderator'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles
    }
  }
}

// Extend NodeJS.ProcessEnv for OCR/LLM keys
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_APP_URL?: string
    OPENAI_API_KEY?: string
    PINECONE_API_KEY?: string
    PINECONE_INDEX?: string
    DEEPSEEK_API_KEY?: string
    DEEPSEEK_API_BASE_URL?: string
    DEEPSEEK_VISION_MODEL?: string
  }
}

// Allow importing legacy pdf.js build without type declarations
declare module 'pdfjs-dist/legacy/build/pdf.js' {
  const value: unknown
  export default value
}