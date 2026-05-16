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
      xhr.setRequestHeader("Content-Type", file.type);

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
   * Derives the permanent public URL from the presigned upload URL.
   * Presigned URL format:
   *   https://objectstorage.<region>.oraclecloud.com/p/<par-token>/n/<namespace>/b/<bucket>/o/<objectName>
   * Public URL format:
   *   https://objectstorage.<region>.oraclecloud.com/n/<namespace>/b/<bucket>/o/<objectName>
   */
  derivePublicUrl(uploadUrl: string): string {
    // Remove the /p/<par-token> segment from the URL
    const url = new URL(uploadUrl);
    const pathParts = url.pathname.split("/");

    // Find the index of 'p' in the path and remove it along with the token
    const pIndex = pathParts.indexOf("p");
    if (pIndex !== -1 && pIndex + 1 < pathParts.length) {
      // Remove /p/<token> (2 segments)
      pathParts.splice(pIndex, 2);
    }

    url.pathname = pathParts.join("/");
    // Remove query params (the presigned signature)
    url.search = "";
    return url.toString();
  }

  /**
   * Full upload flow: get presigned URL → upload file → return objectName.
   * We return the objectName (e.g. "uploads/1778656396271-photo.jpg")
   * because the backend constructs the full URL from it when serving data.
   */
  async uploadFile(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    // Step 1: Get presigned URL
    const { uploadUrl, objectName } = await this.getPresignedUrl(file.name);

    // Step 2: Upload file to presigned URL
    await this.uploadFileToPresignedUrl(uploadUrl, file, onProgress);

    // Step 3: Return the objectName — backend handles full URL construction
    return objectName;
  }
}

export const uploadService = new UploadService();
