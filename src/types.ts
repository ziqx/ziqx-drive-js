/**
 * The structure of the API response returned by Ziqx Drive's sign-URL endpoint.
 */
export interface SignUrlResponse {
  /** Whether the request was successful */
  success: boolean;

  /** Message describing the response or error */
  message: string;

  /** Signed upload URL (present only when success is true) */
  url?: string;
}

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

/** Optional settings for {@link ZDrive}. */
export interface ZDriveOptions {
  /**
   * Ziqx Developers API host used to sign uploads.
   * Defaults to `https://api.ziqx.net`; use `http://127.0.0.1:8080` locally.
   */
  apiUrl?: string;
  /**
   * Ziqx core host, used to sign deletes and as a fallback for drives the
   * Developers API doesn't know yet. Defaults to `https://ziqx.cc`.
   */
  coreUrl?: string;
}
