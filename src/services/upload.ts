import { authService } from "./auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export interface UploadUrlResponse {
  uploadUrl: string;
  objectName: string;
  expiresAt: string;
}

class UploadService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private static readonly EXT_TO_MIME: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
  };

  /**
   * Builds a safe object filename instead of trusting `File.name` verbatim.
   * `File.name` isn't always a clean local filename — e.g. dragging an image
   * in from a browser tab (rather than picking it from disk) can make Chrome
   * synthesize a File whose `.name` is derived from the source URL. Sending
   * that raw string to the backend as the upload key corrupts the resulting
   * object path/URL, so we only ever keep the extension from it.
   */
  private safeFileName(file: File): string {
    const extFromName = /\.([a-zA-Z0-9]{1,5})$/.exec(file.name)?.[1];
    const extFromType = file.type.split("/")[1];
    const ext = (extFromName || extFromType || "jpg").toLowerCase();
    const random = Math.random().toString(36).slice(2, 8);
    return `${Date.now()}-${random}.${ext}`;
  }

  /**
   * Resolves a real image MIME type for the upload's Content-Type header.
   * Some Files (drag-and-drop from a webpage, odd downloads) report an empty
   * `.type`. Uploading with a blank/incorrect Content-Type makes Oracle
   * Object Storage serve the object back without a valid image content type,
   * which Chrome's Opaque Response Blocking then refuses to render — the
   * upload "succeeds" but the image can never load. Fall back to inferring
   * the type from the extension so the stored object always has one.
   */
  private resolveContentType(file: File): string {
    if (file.type) return file.type;
    const ext = /\.([a-zA-Z0-9]{1,5})$/.exec(file.name)?.[1]?.toLowerCase();
    return (ext && UploadService.EXT_TO_MIME[ext]) || "image/jpeg";
  }

  /**
   * Step 1: Request a presigned upload URL from the backend.
   */
  async getPresignedUrl(fileName: string): Promise<UploadUrlResponse> {
    const token = authService.getToken();

    const response = await fetch(
      `${this.baseURL}/api/v1/upload/file`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ fileName }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || "Failed to get presigned upload URL"
      );
    }

    const responseData = await response.json();
    const data = responseData.data || responseData;
    return data;
  }

  /**
   * Step 2: Upload the file to the presigned URL using PUT.
   */
  async uploadFileToPresignedUrl(
    uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", this.resolveContentType(file));

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed due to network error"));
      xhr.send(file);
    });
  }

  /**
   * Full upload flow: get presigned URL → upload file → return objectName.
   * We return the bare objectName (e.g. "uploads/1778656396271-photo.jpg"),
   * never a full URL — the backend prepends its own base path to whatever
   * string it's given, so passing an already-full URL here produces a
   * doubled/broken URL when the backend wraps it a second time.
   */
  async uploadFile(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    // Step 1: Get presigned URL
    const { uploadUrl, objectName } = await this.getPresignedUrl(this.safeFileName(file));

    // Step 2: Upload file to presigned URL
    await this.uploadFileToPresignedUrl(uploadUrl, file, onProgress);

    // Step 3: Return the objectName — backend handles full URL construction
    return objectName;
  }
}

export const uploadService = new UploadService();
