# Page Number Responsibility Fix

## Problem Identified
The AI model's schema included a `"Page Number"` field, suggesting that the model should extract page numbers from the PDF content. However, **PDFs rarely have page numbers written in the text** - they're structural metadata, not content.

## Root Cause
- Model was instructed to extract page numbers from PDF text
- This is impossible because page numbers don't exist in PDF content
- Page numbers are metadata determined by the PDF structure (document.metadata.loc.pageNumber)

## Solution Implemented

### 1. Schema Changes (`lib/ai/schema.ts`)

#### Before:
```typescript
export const ProductFieldsSchema = z.object({
  fields: z.array(
    z.object({
      // ... other fields
      "Page Number": z.number({
        description: "Page number from the PDF where this product was found",
      }),
    })
  ),
});
```

#### After:
```typescript
export const ProductFieldsSchema = z.object({
  fields: z.array(
    z.object({
      // ... other fields (product data only)
      // Note: Page Number is NOT here - model doesn't extract it from content
      // It's assigned by the agent based on PDF structure
    })
  ),
});
```

### 2. Agent Changes (`lib/ai/agent.ts`)

#### Before:
```typescript
const fieldsWithPageNumber = (werkBriefObj.fields || []).map((field) => ({
  ...field,
  "Page Number": pageNumber || field["Page Number"], // ❌ Model doesn't provide this!
}));
```

#### After:
```typescript
// Agent assigns page number to all fields based on PDF structure
// Model doesn't extract page numbers - they're not in the PDF content!
const fieldsWithPageNumber = (werkBriefObj.fields || []).map((field) => ({
  ...field,
  "Page Number": pageNumber ?? 0, // ✅ Agent provides the page number
}));
```

### 3. Data Flow

```
PDF Document
    ↓
PDFLoader.load() → documents with metadata
    ↓
documents.forEach((doc, index) => {
    const pageNumber = doc.metadata.loc.pageNumber; // ← Agent knows this
    ↓
    generateWerkbriefStep(doc.pageContent, pageNumber) // ← Agent passes it
        ↓
        AI Model extracts products from content
        ↓
        Returns: { fields: [...product data...] }
        ↓
    Agent adds page number to each field: { ...field, "Page Number": pageNumber }
})
    ↓
Final result with page numbers assigned correctly
```

## Responsibilities Separation

| Responsibility | Owner | Reason |
|---------------|-------|--------|
| Extract product fields from content | AI Model | Content analysis |
| Assign page numbers | Agent | PDF metadata |
| Track missing pages | Agent | Orchestration logic |
| Calculate total pages | Agent | PDF structure |

## Why This Matters

1. **Accuracy**: Page numbers come from reliable PDF metadata, not unreliable content extraction
2. **Model Efficiency**: Model focuses on what it does best (content extraction)
3. **Separation of Concerns**: Agent handles orchestration/metadata, model handles content
4. **Future-Proof**: If PDFs change format, page tracking logic stays in agent code, not model prompts

## Testing Checklist

- [ ] Test with PDF that has no page numbers in text
- [ ] Verify page numbers are sequential 1, 2, 3...
- [ ] Check missing pages calculation still works
- [ ] Confirm consolidation by page+code still works
- [ ] Validate that "Page Number" field appears in final output

## Related Changes
- See `MODEL_RESPONSIBILITY_FIX.md` for separation of missingPages/totalPages
- See `MISSING_PAGES_FEATURE.md` for overall missing pages tracking
