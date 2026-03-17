import { UploadResponse } from "./types";

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

  /**
   * @module resizeImage
   *
   * A lightweight, browser-based utility for resizing and compressing images
   * using the HTML5 Canvas API. Ideal for reducing image upload size
   * before sending to a server.
   *
   * @example
   * ```ts
   * const client = new ZDriveClient();
   * const input = document.querySelector('input[type="file"]');
   * input?.addEventListener('change', async (e) => {
   *   const file = (e.target as HTMLInputElement).files?.[0];
   *   if (!file) return;
   *
   *   try {
   *     const resized = await client.resizeImage(file, 1024, 0.8);
   *     console.log('Resized image:', resized);
   *   } catch (err) {
   *     console.error('Resize failed:', err);
   *   }
   * });
   * ```
   */

  /**
   * Resize and compress an image before upload using a `<canvas>` element.
   *
   * @async
   * @param {File} file - The original image file selected by the user.
   * @param {number} [maxWidth=1024] - Maximum width (in pixels). Images smaller than this remain unchanged.
   * @param {number} [quality=0.8] - JPEG compression quality (0–1). Ignored for PNGs.
   *
   * @returns {Promise<File>} A `Promise` that resolves to a new, resized `File` object.
   *
   * @throws {Error} If the image cannot be read, decoded, or rendered.
   *
   * @remarks
   * - Automatically preserves the original aspect ratio.
   * - If the image is already smaller than `maxWidth`, it will not be enlarged.
   * - By default, images are output as **JPEG** for compression. For transparency, change `image/jpeg` to `image/png`.
   */
  async resizeImage(
    file: File,
    maxWidth: number = 1024,
    quality: number = 0.8,
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      try {
        if (!(file instanceof File)) {
          throw new Error("Invalid input: expected a File object.");
        }

        const img = new Image();
        const reader = new FileReader();

        // Handle FileReader errors
        reader.onerror = () => {
          reject(new Error("Failed to read the image file."));
        };

        // Once the file is read as a data URL
        reader.onload = (e) => {
          const result = e.target?.result;
          if (!result) {
            reject(new Error("Failed to load image data."));
            return;
          }
          img.src = result as string;
        };

        // Handle image load success
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              reject(
                new Error(
                  "Canvas 2D context is not supported in this environment.",
                ),
              );
              return;
            }

            // Maintain aspect ratio
            const scale = Math.min(maxWidth / img.width, 1);
            const width = img.width * scale;
            const height = img.height * scale;

            canvas.width = width;
            canvas.height = height;

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Convert canvas to Blob (JPEG for compression)
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(
                    new Error("Failed to generate compressed image blob."),
                  );
                  return;
                }

                const resizedFile = new File([blob], file.name, {
                  type: blob.type || "image/jpeg",
                  lastModified: Date.now(),
                });

                resolve(resizedFile);
              },
              "image/jpeg",
              quality,
            );
          } catch (canvasErr) {
            reject(
              new Error(
                `Canvas rendering error: ${(canvasErr as Error).message}`,
              ),
            );
          }
        };

        img.onerror = () => {
          reject(
            new Error(
              "Image decoding failed. The file may be corrupted or unsupported.",
            ),
          );
        };

        reader.readAsDataURL(file);
      } catch (outerErr) {
        reject(new Error(`Unexpected error: ${(outerErr as Error).message}`));
      }
    });
  }
}
