// Utility for handling direct uploads to DigitalOcean Spaces

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  uploadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
}

export interface UploadResult {
  success: boolean;
  fileKey?: string;
  fileUrl?: string;
  error?: string;
}

interface ChunkUploadResult {
  success: boolean;
  chunkIndex: number;
  etag?: string;
  error?: string;
}

// Add compression utility for future use
const compressFile = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("application/pdf")) {
      resolve(file);
      return;
    }

    // For PDFs, we can't compress easily without losing quality
    // But this framework allows for future compression implementations
    resolve(file);
  });
};

// Upload chunk with retry logic
const uploadChunkWithRetry = async (
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  fileName: string,
  uploadId: string,
  maxRetries: number = 3
): Promise<ChunkUploadResult> => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const formData = new FormData();
      formData.append("chunk", chunk);
      formData.append("chunkIndex", chunkIndex.toString());
      formData.append("totalChunks", totalChunks.toString());
      formData.append("fileName", fileName);
      formData.append("uploadId", uploadId);

      const response = await fetch("/api/upload/chunk", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Chunk ${chunkIndex} upload failed: ${
            errorData.error || response.statusText
          }`
        );
      }

      const result = await response.json();
      return {
        success: true,
        chunkIndex,
        etag: result.etag,
      };
    } catch (error) {
      retries++;
      if (retries === maxRetries) {
        return {
          success: false,
          chunkIndex,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, retries) * 1000)
      );
    }
  }

  return {
    success: false,
    chunkIndex,
    error: "Max retries exceeded",
  };
};

// Chunked upload implementation
const uploadFileInChunks = async (
  file: File,
  onProgress: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = `upload_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  let uploadedBytes = 0;
  const startTime = Date.now();

  try {
    // Initialize multipart upload
    const initResponse = await fetch("/api/upload/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadId,
      }),
    });

    if (!initResponse.ok) {
      const errorData = await initResponse.json().catch(() => ({}));
      throw new Error(
        `Failed to initiate upload: ${
          errorData.error || initResponse.statusText
        }`
      );
    }

    const { fileKey } = await initResponse.json();

    // Upload chunks with controlled concurrency
    const CONCURRENT_UPLOADS = 3;
    const chunkResults: ChunkUploadResult[] = [];

    for (let i = 0; i < totalChunks; i += CONCURRENT_UPLOADS) {
      const batch = [];

      for (let j = 0; j < CONCURRENT_UPLOADS && i + j < totalChunks; j++) {
        const chunkIndex = i + j;
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const chunkPromise = uploadChunkWithRetry(
          chunk,
          chunkIndex,
          totalChunks,
          file.name,
          uploadId
        ).then((result) => {
          if (result.success) {
            uploadedBytes += chunk.size;

            // Calculate progress
            const percentage = (uploadedBytes / file.size) * 100;
            const elapsedTime = (Date.now() - startTime) / 1000;
            const speed = uploadedBytes / elapsedTime;
            const remainingBytes = file.size - uploadedBytes;
            const remainingTime = speed > 0 ? remainingBytes / speed : 0;

            onProgress({
              loaded: uploadedBytes,
              total: file.size,
              percentage,
              uploadedBytes,
              totalBytes: file.size,
              speed,
              remainingTime,
            });
          }

          return result;
        });

        batch.push(chunkPromise);
      }

      // Wait for current batch to complete before starting next batch
      const batchResults = await Promise.all(batch);
      chunkResults.push(...batchResults);

      // Check if any chunk failed
      const failedChunk = batchResults.find((r) => !r.success);
      if (failedChunk) {
        throw new Error(
          `Chunk ${failedChunk.chunkIndex} failed: ${failedChunk.error}`
        );
      }
    }

    // Complete multipart upload
    const completeResponse = await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        fileKey,
        chunks: chunkResults.map((r) => ({
          chunkIndex: r.chunkIndex,
          etag: r.etag,
        })),
      }),
    });

    if (!completeResponse.ok) {
      const errorData = await completeResponse.json().catch(() => ({}));
      throw new Error(
        `Failed to complete upload: ${
          errorData.error || completeResponse.statusText
        }`
      );
    }

    const result = await completeResponse.json();

    return {
      success: true,
      fileKey: result.fileKey,
      fileUrl: result.fileUrl,
    };
  } catch (error) {
    // Cleanup failed upload
    try {
      await fetch("/api/upload/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId }),
      });
    } catch (cleanupError) {
      console.error("Failed to cleanup upload:", cleanupError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Chunked upload failed",
    };
  }
};

export async function uploadFileToSpaces(file: File): Promise<UploadResult> {
  try {
    // Step 1: Get presigned URL from our API
    const presignedResponse = await fetch("/api/upload/presigned-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });

    if (!presignedResponse.ok) {
      const error = await presignedResponse.json();
      return {
        success: false,
        error: error.error || "Failed to get upload URL",
      };
    }

    const { presignedUrl, fileKey, fileUrl } = await presignedResponse.json();

    // Step 2: Upload file directly to Spaces using presigned URL
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
        Connection: "keep-alive",
      },
    });

    if (!uploadResponse.ok) {
      return { success: false, error: "Failed to upload file to storage" };
    }

    return {
      success: true,
      fileKey,
      fileUrl,
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

// Optimized upload with progress tracking and chunking for large files
export async function uploadFileToSpacesWithProgress(
  file: File,
  onProgress: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // 1. Compress if possible (for future non-PDF files)
    const compressedFile = await compressFile(file);

    // 2. Use chunked upload for large files (>10MB)
    const CHUNK_THRESHOLD = 10 * 1024 * 1024; // 10MB
    const shouldUseChunkedUpload = compressedFile.size > CHUNK_THRESHOLD;

    if (shouldUseChunkedUpload) {
      return await uploadFileInChunks(compressedFile, onProgress);
    }

    // 3. Optimized single upload for smaller files
    // Get presigned URL
    const presignedResponse = await fetch("/api/upload/presigned-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: compressedFile.name,
        fileType: compressedFile.type,
        fileSize: compressedFile.size,
      }),
    });

    if (!presignedResponse.ok) {
      const error = await presignedResponse.json();
      return {
        success: false,
        error: error.error || "Failed to get upload URL",
      };
    }

    const { presignedUrl, fileKey, fileUrl } = await presignedResponse.json();

    // Upload with progress tracking using XMLHttpRequest
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const elapsedTime = (Date.now() - startTime) / 1000;
          const speed = event.loaded / elapsedTime;
          const remainingBytes = event.total - event.loaded;
          const remainingTime = speed > 0 ? remainingBytes / speed : 0;

          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
            uploadedBytes: event.loaded,
            totalBytes: event.total,
            speed,
            remainingTime,
          });
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          resolve({
            success: true,
            fileKey,
            fileUrl,
          });
        } else {
          resolve({
            success: false,
            error: "Failed to upload file to storage",
          });
        }
      });

      xhr.addEventListener("error", () => {
        resolve({
          success: false,
          error: "Network error during upload",
        });
      });

      xhr.addEventListener("timeout", () => {
        resolve({
          success: false,
          error: "Upload timeout",
        });
      });

      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", compressedFile.type);
      xhr.setRequestHeader("Connection", "keep-alive");
      xhr.timeout = 300000; // 5 minutes timeout
      xhr.send(compressedFile);
    });
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
