// Shared upload session storage
// In production, this should be replaced with Redis or a database

interface UploadSession {
  fileKey: string;
  s3UploadId: string;
}

export const activeUploads = new Map<string, UploadSession>();

export function storeUploadSession(
  uploadId: string,
  fileKey: string,
  s3UploadId: string
): void {
  activeUploads.set(uploadId, { fileKey, s3UploadId });
}

export function getUploadSession(uploadId: string): UploadSession | undefined {
  return activeUploads.get(uploadId);
}

export function removeUploadSession(uploadId: string): void {
  activeUploads.delete(uploadId);
}
