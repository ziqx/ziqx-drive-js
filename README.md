# @ziqx/drive

> Official SDK for Ziqx Drive — generate signed upload URLs and upload files easily.

---

### [📄 Official Docs](https://docs.ziqx.in/docs/ziqx-drive/get-started)

## Features

- Generate signed URLs for secure file uploads & deletions (server-side)
- Support for folders/paths in uploads and deletions
- Upload files directly from the browser using signed URLs
- Written in **TypeScript** with full type safety
- Easy integration with **React**, **Next.js**, or any Node.js backend

---

## Installation

```bash
# Using npm
npm install @ziqx/drive

# Using yarn
yarn add @ziqx/drive
```

---

## Usage

### 1. Server-side: Generate Signed URLs (`ZDrive`)

```ts
import { ZDrive } from "@ziqx/drive";

async function generateSignedUrl() {
  // Drive key and secret from Ziqx Developers → your app → Drive.
  const drive = new ZDrive("your-drive-key", "your-drive-secret");

  // Generate signed URL for a file (can specify an optional folder)
  const signed = await drive.generatePutUrl("example.jpg", "vacation/2024");

  if (signed.success && signed.url) {
    console.log("✅ Signed URL:", signed.url);
  } else {
    console.error("❌ Error generating URL:", signed.message);
  }

  // Delete using the exact stored filename returned by the upload response.
  // Uploads add a unique suffix; the original name ("example.jpg") is not the stored name.
  const deleted = await drive.deleteFile("example-a1b2c3d4.jpg", "vacation/2024");
  console.log("Deleted:", deleted);
}

generateSignedUrl();
```

> Use this signed URL to upload files directly from the browser.

---

### 2. Client-side: Upload Files (`ZDriveClient`)

```ts
import { ZDriveClient } from "@ziqx/drive";

// Example: handling file upload from an <input type="file" />
async function handleUpload(file: File, signedUrl: string) {
  const client = new ZDriveClient();
  const response = await client.uploadFile(signedUrl, file);

  if (response.success) {
    console.log("✅ File uploaded:", response.filename);
  } else {
    console.error("❌ Upload failed:", response.message);
  }
}

// Usage: triggered when user selects a file
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
fileInput.addEventListener("change", async () => {
  if (fileInput.files?.length) {
    // Assume `signedUrl` comes from your backend
    const signedUrl = await fetch("/api/drive/sign-url")
      .then((res) => res.json())
      .then((r) => r.url);
    await handleUpload(fileInput.files[0], signedUrl);
  }
});
```

### Compress Image

```ts
const client = new ZDriveClient();
const resizedImage = await client.resizeImage(file);
```

---

## API

### `ZDrive`

| Method                                              | Description                       | Parameters                                    | Returns                    |
| --------------------------------------------------- | --------------------------------- | --------------------------------------------- | -------------------------- |
| `generatePutUrl(fileName: string, folder?: string)` | Generates a signed URL for a file | `fileName`: Name<br>`folder`: Path (Optional) | `Promise<SignUrlResponse>` |
| `generateDeleteUrl(fileName: string, folder?: string)` | Signs deletion of an existing file | `fileName`: Stored name or relative path<br>`folder`: Path (Optional) | `Promise<SignUrlResponse>` |
| `deleteFile(fileName: string, folder?: string)`     | Deletes a file from Ziqx Drive    | `fileName`: Name<br>`folder`: Path (Optional) | `Promise<UploadResponse>`  |

For deletion, pass the upload response's `filename` directly (it already includes
the folder), or pass the stored basename and folder separately. For example,
`drive.deleteFile("vacation/2024/example-a1b2c3d4.jpg")` targets the same file as
the example above. Do not pass the CDN URL or the original upload name.

### Endpoints

- **Uploads** are signed by the Ziqx Developers API: `GET https://api.ziqx.net/v1/drive/sign-url`.
  If that API doesn't know the drive yet (a drive created in core before the
  move to Ziqx Developers), the SDK retries once on core's original route.
- **Deletes** are signed by core: `DELETE https://ziqx.cc/api/drive/sign-url`.

Both take `x-drive-key` / `x-drive-secret` headers and `filename` plus an optional
`folder`. Upload names are cleaned first (letters, numbers, spaces, dots, dashes
and underscores; anything else becomes a dash); delete names are sent exactly.
Failed signing returns `{ success: false, message }` with the server's reason,
for example `"Invalid drive key or secret"` or `"Too many signing requests"`.

### Local development

```ts
const drive = new ZDrive(key, secret, {
  apiUrl: "http://127.0.0.1:8080", // local Ziqx Developers backend
  coreUrl: "http://localhost:3000", // local core-web
});
```

---

### `ZDriveClient`

| Method                                      | Description                           | Parameters                                                 | Returns                   |
| ------------------------------------------- | ------------------------------------- | ---------------------------------------------------------- | ------------------------- |
| `uploadFile(uploadUrl: string, file: File)` | Uploads a file directly to Ziqx Drive | `uploadUrl` — Signed URL<br>`file` — Browser `File` object | `Promise<UploadResponse>` |

---

## Response Types

### `SignUrlResponse`

```ts
interface SignUrlResponse {
  success: boolean;
  message: string;
  url?: string;
}
```

### `UploadResponse`

```ts
interface UploadResponse {
  success: boolean;
  message: string;
  filename?: string;
  driveid?: string;
}
```

---

## Notes

- `ZDrive` **must be used server-side**, as it requires your `driveSecret`.
- `ZDriveClient` **must be used in the browser**, using signed URLs generated by `ZDrive`.
- Ensure your backend **never exposes `driveSecret`** to clients.

---

## AI Agent Skills

If you are using an AI agent, you can add `ziqx-drive-js` related skills to your agent using the following command:

```bash
npx skills add ziqx/ziqx-ai-skills
```

## License

MIT © [ZIQX](https://ziqx.cc)
