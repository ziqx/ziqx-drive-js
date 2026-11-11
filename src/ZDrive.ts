import { DEFAULT_API_URL, DEFAULT_CORE_URL } from "./constants";
import { SignUrlResponse, UploadResponse, ZDriveOptions } from "./types";

/**
 * Upload names may contain letters, numbers, spaces, dots, dashes and
 * underscores, starting with a letter or number. Anything else becomes a dash
 * (the stored name is cleaned further and gets a unique suffix).
 */
export function cleanUploadName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._ -]/g, "-")
    .replace(/^[^A-Za-z0-9]+/, "")
    .slice(0, 200);
  return cleaned || "file";
}

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

  /** Upload signing on the Ziqx Developers API. */
  private signUrl: string;

  /** Core's signing route: deletes, and the upload fallback. */
  private legacySignUrl: string;

  /**
   * Creates a new instance of ZDrive with your Drive credentials.
   *
   * @param driveKey - The unique key associated with your Ziqx Drive account.
   * @param driveSecret - The secret token for authenticating your requests.
   * @param options - (Optional) `apiUrl` / `coreUrl` overrides, e.g. for local development.
   *
   * ---
   * **Example:**
   * ```ts
   * const drive = new ZDrive("your-drive-key", "your-drive-secret");
   * ```
   */
  constructor(driveKey: string, driveSecret: string, options: ZDriveOptions = {}) {
    this.driveKey = driveKey;
    this.driveSecret = driveSecret;
    const api = new URL(options.apiUrl ?? DEFAULT_API_URL).origin;
    const core = new URL(options.coreUrl ?? DEFAULT_CORE_URL).origin;
    this.signUrl = `${api}/v1/drive/sign-url`;
    this.legacySignUrl = `${core}/api/drive/sign-url`;
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
    const name = cleanUploadName(fileName);
    const signed = await this.request(this.signUrl, name, folder, "GET");
    // Drives created in core before the move to Ziqx Developers may only be
    // known to core until the import runs; core still signs those.
    if (signed.status === 401 || signed.status === 404) {
      const legacy = await this.request(this.legacySignUrl, name, folder, "GET");
      if (legacy.body.success) return legacy.body;
    }
    return signed.body;
  }

  /**
   * Signs a DELETE URL for the exact stored filename returned by an upload.
   * Pass a drive-relative path, or a basename with its folder separately.
   */
  async generateDeleteUrl(
    fileName: string,
    folder?: string,
  ): Promise<SignUrlResponse> {
    // Only core signs deletes; it verifies the drive with Ziqx Developers.
    return (await this.request(this.legacySignUrl, fileName, folder, "DELETE"))
      .body;
  }

  private async request(
    endpoint: string,
    fileName: string,
    folder: string | undefined,
    method: "GET" | "DELETE",
  ): Promise<{ status: number; body: SignUrlResponse }> {
    const query = new URLSearchParams({ filename: fileName });
    if (folder) query.set("folder", folder);
    const url = `${endpoint}?${query}`;

    try {
      // Use the HTTP method to select upload or delete signing.
      const res = await fetch(url, {
        method,
        headers: {
          "x-drive-key": this.driveKey,
          "x-drive-secret": this.driveSecret,
          "Content-Type": "application/json",
        },
      });

      const data = (await res.json().catch(() => null)) as
        | SignUrlResponse
        | null;
      if (!res.ok || !data) {
        // Keep the server's reason, e.g. "Invalid drive key or secret".
        return {
          status: res.status,
          body: {
            success: false,
            message:
              data?.message ||
              `Failed to fetch signed URL: ${res.statusText || res.status}`,
          },
        };
      }
      return { status: res.status, body: data };
    } catch (error: any) {
      // Return a normalized response structure on network or fetch errors.
      return {
        status: 0,
        body: {
          success: false,
          message:
            error?.message || "Network error while generating signed URL",
        },
      };
    }
  }

  /** Deletes the exact stored filename returned by the upload response. */
  async deleteFile(filename: string, folder?: string): Promise<UploadResponse> {
    const signedUrl = await this.generateDeleteUrl(filename, folder);
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
