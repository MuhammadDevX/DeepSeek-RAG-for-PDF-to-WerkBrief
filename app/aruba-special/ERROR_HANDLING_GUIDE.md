# Aruba Special - Error Handling & Debugging Guide

## Overview

The Aruba Special feature now has comprehensive error handling and detailed logging throughout the entire request lifecycle. This makes debugging easy and provides clear feedback to users.

## Logging System

### Emoji Prefix System

All logs use visual emoji prefixes for quick scanning:

- 🚀 **Start/Initialize** - Beginning of operations
- ✅ **Success** - Successful operations
- ❌ **Error** - Errors and failures
- ⚠️ **Warning** - Warnings and non-critical issues
- 📤 **Upload** - File upload operations
- ⬇️ **Download** - File download operations
- 📡 **API/Network** - API calls and network operations
- 📦 **Request/Response** - Request/response data
- 📥 **Processing** - Data processing operations
- 📊 **Progress** - Progress updates
- 📄 **File Operations** - File-specific operations
- 🔍 **Extraction** - Data extraction operations
- 🤖 **AI Operations** - AI enrichment operations
- 🏁 **Complete** - Completion of operations
- 🧹 **Cleanup** - Resource cleanup operations
- 🔌 **Stream** - Streaming operations
- 👤 **User/Auth** - User and authentication operations

## Frontend Logging (page.tsx)

### Upload Phase

```
🚀 Starting PDF processing...
📤 Starting file uploads... Total files: X
⬆️ Uploading file X/Y: filename.pdf
✅ Upload successful: filename.pdf -> fileKey
```

### API Call Phase

```
🔄 Sending processing request to API...
📦 Request body: { description, files: [...], streaming: true }
📡 API Response status: 200 OK
```

### Stream Processing Phase

```
📥 Processing response stream...
📨 Stream message #X: { type, step, pdf, progress }
✅ Processing complete! Data received: { groups, totalFields }
```

### Error Handling

All errors are:

1. **Logged** with full context and stack traces
2. **Categorized** into user-friendly types:
   - Upload Error
   - Server Error
   - Configuration Error
3. **Displayed** to users via toast notifications

## Backend Logging (route.ts)

### Request Validation

```
🚀 API: aruba-special POST request received
👤 User role: admin
📦 Request body received: { hasDescription: true, filesCount: 2, streaming: true }
✅ Validation passed. Processing 2 files with streaming: true
```

### Streaming Setup

```
📡 Setting up Server-Sent Events streaming...
   Files to process: file1.pdf, file2.pdf
   Description: Generate GOEDEREN CODE and OMSCHRIJVING...
🔌 Stream controller initialized
```

### PDF Processing

```
📥 Starting background processing...
📄 Processing file 1/2: ClientName
⬇️ Downloading file from Spaces: fileKey
✅ Downloaded 123456 bytes
🔍 Extracting products from ClientName...
✅ Extracted 45 products
🤖 Enriching 45 products with AI...
   📊 Progress: 10/45 - Processing product batch 1
✅ AI enrichment complete for ClientName
```

### Completion & Cleanup

```
✅ All processing complete! Total groups: 2
   Total enriched fields across all groups: 90
🏁 Closing stream controller
🧹 Starting cleanup of 2 uploaded files...
   ✅ Cleaned up: fileKey1
   ✅ Cleaned up: fileKey2
🧹 Cleanup complete: 2 successful, 0 failed
```

## Error Scenarios

### 1. Missing Description (400)

**Frontend:**

```
❌ Error in handleGenerate: Configuration Error: Missing description parameter
```

**Backend:**

```
❌ Missing description in request
```

**User Message:** "Configuration Error: Missing description parameter"

### 2. Upload Failure

**Frontend:**

```
❌ Error during file upload: filename.pdf
   Details: Upload failed: Network error
   Stack trace: Error: Upload failed...
```

**User Message:** "Upload Error: Failed to upload filename.pdf - Network error"

### 3. PDF Extraction Error

**Backend:**

```
❌ Error processing ClientName: Error: Invalid PDF format
   Details: Invalid PDF format
   Stack trace: Error: Invalid PDF format...
```

**Stream Message:** "Failed to process ClientName: Invalid PDF format"

### 4. AI Enrichment Error

**Backend:**

```
🤖 Enriching 45 products with AI...
   📊 Progress: 10/45 - Processing product batch 1
❌ Error processing ClientName: Error: AI service timeout
   Details: AI service timeout
   Stack trace: Error: AI service timeout...
```

### 5. Stream Cancellation

**Backend:**

```
⚠️ Stream cancelled by client
⚠️ Stream controller closed, stopping processing
```

## Debugging Tips

### Quick Console Scan

1. **Open DevTools Console** (F12)
2. **Look for emoji prefixes** to quickly identify stages
3. **Filter by emoji** to focus on specific operations:
   - Filter "❌" for errors
   - Filter "📄" for file operations
   - Filter "🤖" for AI operations

### Tracking a Request End-to-End

1. **Frontend:** Look for "🚀 Starting PDF processing..."
2. **Upload:** Check "⬆️ Uploading file" for each file
3. **API Call:** Verify "📡 API Response status: 200"
4. **Backend:** Find "🚀 API: aruba-special POST request received"
5. **Processing:** Track "📄 Processing file X/Y" for each PDF
6. **Completion:** Confirm "✅ All processing complete!"

### Common Issues

#### "description is required" (400)

- **Check:** Frontend sends correct payload structure
- **Fix:** Ensure `{ description: string, files: [], streaming: boolean }`

#### Upload Fails

- **Check:** Network connectivity, Spaces credentials
- **Fix:** Verify SPACES_ACCESS_KEY, SPACES_SECRET_KEY, SPACES_ENDPOINT

#### Stream Stops Mid-Processing

- **Check:** Backend logs for "⚠️ Stream controller closed"
- **Fix:** Increase timeout settings or check network stability

#### AI Enrichment Slow/Fails

- **Check:** "🤖 Enriching X products with AI..." and progress logs
- **Fix:** Verify OpenAI API key, check rate limits, increase timeout

## File Structure

### Frontend Components

- `app/aruba-special/page.tsx` - Main page with error handling
- `app/aruba-special/_components/ArubaFileUploadSection.tsx` - Upload UI
- `app/aruba-special/_components/ArubaProgress.tsx` - Progress display

### Backend

- `app/api/aruba-special/route.ts` - API endpoint with streaming

### Shared Utilities

- `lib/spaces-utils.ts` - File upload/download
- `lib/pdf-parser.ts` - PDF extraction
- `lib/ai/agent.ts` - AI enrichment

## Testing Checklist

- [ ] Upload single PDF - check logs from start to finish
- [ ] Upload multiple PDFs - verify parallel processing logs
- [ ] Trigger upload error - confirm error logging and user message
- [ ] Trigger API error - verify frontend receives and logs error
- [ ] Cancel during processing - check cleanup logs
- [ ] Test with invalid PDF - verify extraction error handling
- [ ] Test with streaming disabled - check non-streaming logs

## Monitoring Production

For production environments:

1. **Keep Console Logs** - They're essential for debugging user issues
2. **Add Log Aggregation** - Consider sending logs to external service
3. **Monitor Error Rates** - Track "❌" logs frequency
4. **Set Up Alerts** - Alert on repeated errors or long processing times

---

**Last Updated:** January 2025  
**Version:** 1.0.0
