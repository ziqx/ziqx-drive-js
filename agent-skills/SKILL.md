---
name: ziqx-drive-sdk
description: SDK for Ziqx Drive providing client-side file upload and server-side signed URL generation.
---

# @ziqx/drive Skill

This skill provides comprehensive instructions on how to use the `@ziqx/drive` package for managing file uploads to Ziqx Drive. It handles both server-side signed URL generation and client-side direct uploads.

## Overview

`@ziqx/drive` is split into two main components:

1. **`ZDrive` (Server-side)**: Used to securely generate signed upload URLs using your Drive credentials.
2. **`ZDriveClient` (Client-side)**: Used in the browser to upload files directly to the signed URLs and perform image processing (like resizing) before upload.

---

## Installation

```bash
npm install @ziqx/drive
```

---

## Technical Implementation

### 1. Server-side: Generating Signed URLs

To allow a client to upload a file directly to Ziqx Drive, you must first generate a signed URL on your server. This prevents exposing your `ZDRIVE_SECRET` to the client.

#### API Reference: `ZDrive`

- `constructor(driveKey: string, driveSecret: string)`
- `generatePutUrl(fileName: string, folder?: string): Promise<SignUrlResponse>`
- `deleteFile(fileName: string, folder?: string): Promise<any>`

#### Logic Flow

1. Initialize `ZDrive` with your credentials.
2. Call `generatePutUrl` with the intended filename.
3. Return the `url` to the client.

---

### 2. Client-side: Uploading Files

The client uses the signed URL to perform a `multipart/form-data` POST request directly to Ziqx Drive.

#### API Reference: `ZDriveClient`

- `uploadFile(uploadUrl: string, file: File): Promise<UploadResponse>`
- `resizeImage(file: File, maxWidth?: number, quality?: number): Promise<File>` (Browser only)

#### Logic Flow

1. Obtain the signed URL from your server.
2. (Optional) Resize the image using `ZDriveClient.resizeImage`.
3. Call `uploadFile` with the signed URL and the `File` object.

---

## Next.js Implementation Guide

This is the recommended pattern for Next.js applications using Server Actions.

### A. Server Action (`actions/drive.ts`)

Create a server action to securely generate the signed URL.

```typescript
"use server";

import { ENV } from "@/constants/envs";
import { ZDrive } from "@ziqx/drive";

/**
 * Generates a signed upload URL for Ziqx Drive.
 * This should ALWAYS be called from the server to protect credentials.
 */
export async function generateSignedUrl(fileName: string, folder?: string) {
  // Initialize with drive credentials from environment variables
  const drive = new ZDrive(ENV.ZDRIVE_KEY!, ENV.ZDRIVE_SECRET!);

  const signed = await drive.generatePutUrl(fileName, folder);

  if (signed.success && signed.url) {
    return signed.url;
  } else {
    console.error("❌ Error generating URL:", signed.message);
    return null;
  }
}

/**
 * Deletes a file from Ziqx Drive.
 */
export async function deleteFromDrive(fileName: string, folder?: string) {
  const drive = new ZDrive(ENV.ZDRIVE_KEY!, ENV.ZDRIVE_SECRET!);
  return await drive.deleteFile(fileName, folder);
}
```

### B. Client Component Usage

Use `ZDriveClient` in your frontend components to handle the actual upload process.

```typescript
"use client";

import { ZDriveClient } from "@ziqx/drive";
import { generateSignedUrl } from "@/actions/drive";

// ... inside your component

const handleUpload = async (options: any) => {
  const { file, onSuccess, onError } = options;
  const client = new ZDriveClient();

  try {
    // 1. Get signed URL from the server action
    const signedUrl = await generateSignedUrl(file.name);
    if (!signedUrl) throw new Error("Failed to get signed URL");

    // 2. Upload to Ziqx Drive directly from the browser
    const uploadRes = await client.uploadFile(signedUrl, file);

    if (!uploadRes.success || !uploadRes.filename) {
      throw new Error("Upload to ZDrive failed");
    }

    // 3. Handle success
    onSuccess(uploadRes.filename);
  } catch (err) {
    console.error("Upload Error:", err);
    onError(new Error("Upload failed"));
  }
};
```

---

## Best Practices for AI Agents

1.  **Always use Environment Variables**: Never hardcode `driveKey` or `driveSecret`. Ensure they are stored in `.env` and accessed via `process.env` or a config constants file.
2.  **Server vs Client separation**: Remind the developer that `ZDrive` is for server-side (Node.js/Server Actions/API Routes) and `ZDriveClient` is for client-side (Browser). `ZDriveClient` uses browser-native `FormData` and `fetch`.
3.  **File Naming**: When generating a signed URL, ensure the filename passed to `generatePutUrl` matches or is appropriate for the file being uploaded.
4.  **Error Handling**: Always check for `signed.success` on the server and `uploadRes.success` on the client.
5.  **Image Optimization**: If the user is uploading images, suggest using `client.resizeImage(file, 1024, 0.8)` before calling `uploadFile` to save bandwidth and storage.
6.  **Folder Organization**: Encourage using the `folder` parameter to organize files (e.g., `users/123/avatars`) for better storage management.

---

## Examples

#### Simple Client-side Upload Logic

```typescript
const signedUrl = await generateSignedUrl(file.name);
if (!signedUrl) throw new Error("Failed to get signed URL");

// Upload to Object Storage
const client = new ZDriveClient();
const uploadRes = await client.uploadFile(signedUrl, file);

if (!uploadRes.success || !uploadRes.filename)
  throw new Error("Upload to ZDrive failed");

console.log("Uploaded filename:", uploadRes.filename);
```
