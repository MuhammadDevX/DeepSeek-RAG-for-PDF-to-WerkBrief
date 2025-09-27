// Utility for handling direct uploads to DigitalOcean Spaces

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  fileKey?: string;
  fileUrl?: string;
  error?: string;
}

export async function uploadFileToSpaces(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
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

// Alternative upload with XMLHttpRequest for progress tracking
export async function uploadFileToSpacesWithProgress(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Step 1: Get presigned URL
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

    // Step 2: Upload with progress tracking
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
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

      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
