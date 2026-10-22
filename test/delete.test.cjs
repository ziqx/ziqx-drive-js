const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const { ZDrive } = require("../dist/index.js");

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("deletion signs the stored path for DELETE before deleting it", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: new URL(url), options });
    return calls.length === 1
      ? Response.json({ success: true, url: "https://upload.drive.ziqx.net/?key=delete-key" })
      : Response.json({ success: true, filename: "images/photo-abc12345.png" });
  };
  const result = await new ZDrive("drive-id", "drive-secret")
    .deleteFile("images/photo-abc12345.png");
  assert.equal(result.success, true);
  assert.equal(calls[0].url.searchParams.get("filename"), "images/photo-abc12345.png");
  assert.equal(calls[0].url.searchParams.has("method"), false);
  assert.equal(calls[0].options.method, "DELETE");
  assert.equal(calls[0].options.headers["x-drive-key"], "drive-id");
  assert.equal(calls[0].options.headers["x-drive-secret"], "drive-secret");
  assert.equal(calls[1].url.searchParams.get("key"), "delete-key");
  assert.equal(calls[1].options.method, "DELETE");
});

test("supports a basename and separate folder without changing upload signing", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: new URL(url), options });
    return Response.json({ success: true, url: "https://upload.drive.ziqx.net/?key=test" });
  };
  const drive = new ZDrive("drive-id", "drive-secret");
  await drive.generateDeleteUrl("photo-abc12345.png", "images/2026");
  await drive.generatePutUrl("Photo.png", "images/2026");
  assert.equal(calls[0].url.searchParams.get("folder"), "images/2026");
  assert.equal(calls[0].url.searchParams.get("filename"), "photo-abc12345.png");
  assert.equal(calls[0].url.searchParams.has("method"), false);
  assert.equal(calls[0].options.method, "DELETE");
  assert.equal(calls[1].url.searchParams.get("filename"), "Photo.png");
  assert.equal(calls[1].url.searchParams.has("method"), false);
  assert.equal(calls[1].options.method, "GET");
});

test("failed signing never sends a delete request", async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return Response.json({ success: false, message: "Invalid filename" });
  };
  await assert.rejects(new ZDrive("key", "secret").deleteFile("../photo.png"),
    /Failed to generate signed URL for deletion/);
  assert.equal(requests, 1);
});

test("a missing object is not reported as a successful delete", async () => {
  let requests = 0;
  globalThis.fetch = async () => ++requests === 1
    ? Response.json({ success: true, url: "https://upload.drive.ziqx.net/?key=test" })
    : Response.json({ success: false, message: "File not found" }, { status: 404, statusText: "Not Found" });
  await assert.rejects(new ZDrive("key", "secret").deleteFile("missing.png"),
    /Failed to delete file: Not Found/);
});
