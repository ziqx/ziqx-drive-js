/**
 * Represents the standard response returned after uploading a file to Ziqx Drive.
 */
export interface UploadResponse {
  /** Whether the upload was successful. */
  success: boolean;

  /** A descriptive message about the upload result. */
  message: string;

  /** The uploaded file's name (as stored on Ziqx Drive). */
  filename?: string;

  /** The drive ID that received the uploaded file. */
  driveid?: string;
}

/**
 * ZDriveClient — Used **on the browser side** to upload files
 * using a pre-generated signed URL from Ziqx Drive.
 *
 * This class should be used only in the **client environment** (e.g., React, Next.js frontend),
 * as it depends on the native `fetch` and `FormData` browser APIs.
 *
 * ---
 * ### 🧠 Example Usage
 * ```ts
 * import { ZDriveClient } from "zdrive-sdk";
 *
 * async function handleUpload(file: File) {
 *   // 1️⃣ Fetch signed URL from your backend (server should use ZDrive to generate it)
 *   const signed = await fetch("/api/drive/sign-url").then(res => res.json());
 *
 *   if (!signed.success || !signed.url) {
 *     console.error("Failed to get signed URL:", signed.message);
 *     return;
 *   }
 *
 *   // 2️⃣ Upload the file directly to Ziqx Drive
 *   const client = new ZDriveClient();
 *   const upload = await client.uploadFile(signed.url, file);
 *
 *   // 3️⃣ Check response
 *   if (upload.success) {
 *     console.log("✅ Uploaded:", upload.filename);
 *   } else {
 *     console.error("❌ Upload failed:", upload.message);
 *   }
 * }
 * ```
 */
export class ZDriveClient {
  /**
   * Uploads a file directly to Ziqx Drive using the signed URL provided by your server.
   *
   * ---
   * ### ⚙️ How It Works
   * - You first generate a **signed upload URL** on your backend using `ZDrive.generatePutUrl()`.
   * - Then, pass that URL and a `File` object (from `<input type="file" />`) into this function.
   * - It uploads the file using a `multipart/form-data` POST request.
   *
   * @param uploadUrl - The signed upload URL obtained from your backend.
   * @param file - The `File` object selected by the user (e.g., from a file input or drag-drop).
   * @returns A Promise resolving to an {@link UploadResponse} with details of the uploaded file.
   *
   * ---
   * ### 🧩 Example
   * ```ts
   * const client = new ZDriveClient();
   * const uploadResult = await client.uploadFile(signedUrl, selectedFile);
   * console.log(uploadResult);
   * ```
   */
  async uploadFile(uploadUrl: string, file: File): Promise<UploadResponse> {
    try {
      // Create a new FormData object to send the file as multipart/form-data.
      const formData = new FormData();
      formData.append("file", file);

      // Perform the POST request to the signed URL.
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      // If the server did not respond with HTTP 200-299, treat it as a failure.
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      // Parse the JSON response (expected format is defined by Ziqx Drive).
      const data = (await res.json()) as UploadResponse;
      return data;
    } catch (error: any) {
      // Gracefully handle any network or runtime errors and return consistent structure.
      return {
        success: false,
        message: error.message || "Network error while uploading file",
      };
    }
  }
}
