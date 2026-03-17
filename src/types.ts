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
