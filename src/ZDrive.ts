import { SIGN_URL } from "./constants";
import { SignUrlResponse, UploadResponse } from "./types";

/**
 * ZDrive class — handles generating signed URLs for uploading files to Ziqx Drive.
 * Read More: https://docs.ziqx.in/docs/ziqx-drive/sign-url
 * ---
 * **Example:**
 * ```ts
 * import { ZDrive } from "@ziqx/drive";
 *
 * // Initialize with your drive credentials
 * const drive = new ZDrive("your-drive-key", "your-drive-secret");
 *
 * // Generate a signed URL for the given file
 * const signed = await drive.generatePutUrl("photo.jpg");
 *
 * if (signed.success) {
 *   console.log("Signed URL:", signed.url);
 * } else {
 *   console.error("Failed:", signed.message);
 * }
 * ```
 */
export class ZDrive {
  /** Your Ziqx Drive Key */
  private driveKey: string;

  /** Your Ziqx Drive Secret */
  private driveSecret: string;

  /**
   * Creates a new instance of ZDrive with your Drive credentials.
   *
   * @param driveKey - The unique key associated with your Ziqx Drive account.
   * @param driveSecret - The secret token for authenticating your requests.
   *
   * ---
   * **Example:**
   * ```ts
   * const drive = new ZDrive("your-drive-key", "your-drive-secret");
   * ```
   */
  constructor(driveKey: string, driveSecret: string) {
    this.driveKey = driveKey;
    this.driveSecret = driveSecret;
  }

  /**
   * Generates a signed upload URL for a specific file name.
   * The signed URL allows uploading directly to Ziqx Drive.
   *
   * @param fileName - The name (and optional extension) of the file you plan to upload.
   * @returns A Promise that resolves to a {@link SignUrlResponse} containing success, message, and the signed URL.
   *
   * ---
   * **Example:**
   * ```ts
   * const signed = await drive.generatePutUrl("avatar.png");
   *
   * if (signed.success && signed.url) {
   *   console.log("Upload URL:", signed.url);
   * }
   * ```
   */
  async generatePutUrl(
    fileName: string,
    folder?: string,
  ): Promise<SignUrlResponse> {
    // Construct the endpoint URL with the file name as a query parameter.
    let url = `${SIGN_URL}?filename=${encodeURIComponent(fileName)}`;
    if (folder) {
      url += `&folder=${encodeURIComponent(folder)}`;
    }

    try {
      // Make the GET request to obtain a signed URL.
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "x-drive-key": this.driveKey,
          "x-drive-secret": this.driveSecret,
          "Content-Type": "application/json",
        },
      });

      // Handle non-OK HTTP responses (e.g., 400, 403, 500)
      if (!res.ok) {
        throw new Error(`Failed to fetch signed URL: ${res.statusText}`);
      }

      // Parse the JSON response into the expected structure.
      const data = (await res.json()) as SignUrlResponse;
      return data;
    } catch (error: any) {
      // Return a normalized response structure on network or fetch errors.
      return {
        success: false,
        message: error.message || "Network error while generating signed URL",
      };
    }
  }

  async deleteFile(filename: string, folder?: string): Promise<UploadResponse> {
    const signedUrl = await this.generatePutUrl(filename, folder);
    if (!signedUrl.success || !signedUrl.url) {
      throw new Error("Failed to generate signed URL for deletion");
    }
    const res = await fetch(signedUrl.url, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete file: ${res.statusText}`);
    }
    return res.json();
  }
}
