/** Ziqx Developers API: signs uploads for every drive. */
export const DEFAULT_API_URL: string = "https://api.ziqx.net";
/** Ziqx core: signs deletes, and uploads for drives Developers doesn't know yet. */
export const DEFAULT_CORE_URL: string = "https://ziqx.cc";

/** Upload signing on the Ziqx Developers API. */
export const SIGN_URL: string = `${DEFAULT_API_URL}/v1/drive/sign-url`;
/** Core's original signing route (uploads and deletes). */
export const LEGACY_SIGN_URL: string = `${DEFAULT_CORE_URL}/api/drive/sign-url`;
export const UPLOAD_URL: string = "https://upload.drive.ziqx.net";
