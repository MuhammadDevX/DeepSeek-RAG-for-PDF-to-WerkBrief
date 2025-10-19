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

// Simple upload function without progress tracking
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

// Unified upload with progress tracking for all file sizes
export async function uploadFileToSpacesWithProgress(
  file: File,
  onProgress: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // 1. Compress if possible (for future non-PDF files)
    const compressedFile = await compressFile(file);

    console.log(
      `Uploading ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB file`
    );

    // 2. Get presigned URL
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

    // 3. Upload with progress tracking using XMLHttpRequest
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
          error: "Upload timeout - please try again or check your connection",
        });
      });

      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", compressedFile.type);
      xhr.setRequestHeader("Connection", "keep-alive");
      xhr.timeout = 2400000; // 40 minutes timeout for large files
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
