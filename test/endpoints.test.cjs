const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const { ZDrive, cleanUploadName } = require("../dist/index.js");

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const signed = Response.json.bind(Response, { success: true, message: "Success", url: "https://upload.drive.ziqx.net/?key=k" });

test("uploads are signed on the Ziqx Developers API", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url: new URL(url), options }); return signed(); };
  const result = await new ZDrive("drive-id", "secret").generatePutUrl("photo.png", "images");
  assert.equal(result.success, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin + calls[0].url.pathname, "https://api.ziqx.net/v1/drive/sign-url");
  assert.equal(calls[0].url.searchParams.get("folder"), "images");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers["x-drive-key"], "drive-id");
});

test("deletes are still signed by core", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url: new URL(url), options }); return signed(); };
  await new ZDrive("drive-id", "secret").generateDeleteUrl("photo-abc12345.png");
  assert.equal(calls[0].url.origin + calls[0].url.pathname, "https://ziqx.cc/api/drive/sign-url");
  assert.equal(calls[0].options.method, "DELETE");
});

test("a drive only core knows falls back to core for uploads", async () => {
  const hosts = [];
  globalThis.fetch = async (url) => {
    hosts.push(new URL(url).host);
    return hosts.length === 1
      ? Response.json({ success: false, message: "Invalid drive key or secret" }, { status: 401 })
      : signed();
  };
  const result = await new ZDrive("drive-id", "secret").generatePutUrl("a.png");
  assert.equal(result.success, true);
  assert.deepEqual(hosts, ["api.ziqx.net", "ziqx.cc"]);
});

test("a real rejection keeps the server's message", async () => {
  globalThis.fetch = async () => Response.json({ success: false, message: "Invalid drive key or secret" }, { status: 401 });
  const result = await new ZDrive("drive-id", "wrong").generatePutUrl("a.png");
  assert.equal(result.success, false);
  assert.equal(result.message, "Invalid drive key or secret");
});

test("rate limits are not retried on core", async () => {
  let requests = 0;
  globalThis.fetch = async () => { requests++; return Response.json({ success: false, message: "Too many signing requests" }, { status: 429 }); };
  const result = await new ZDrive("drive-id", "secret").generatePutUrl("a.png");
  assert.equal(requests, 1);
  assert.equal(result.message, "Too many signing requests");
});

test("upload names are cleaned to what the API accepts; deletes are sent verbatim", async () => {
  const pattern = /^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,254}$/;
  for (const name of ["My Photo (1).jpg", "résumé.pdf", "__init.txt", "???", "a/b.png"])
    assert.match(cleanUploadName(name), pattern, name);
  const calls = [];
  globalThis.fetch = async (url) => { calls.push(new URL(url)); return signed(); };
  const drive = new ZDrive("id", "s");
  await drive.generatePutUrl("My Photo (1).jpg");
  await drive.generateDeleteUrl("images/my-photo-1-abc12345.jpg");
  assert.equal(calls[0].searchParams.get("filename"), "My Photo -1-.jpg");
  assert.equal(calls[1].searchParams.get("filename"), "images/my-photo-1-abc12345.jpg");
});

test("local hosts can be configured", async () => {
  const calls = [];
  globalThis.fetch = async (url) => { calls.push(new URL(url)); return signed(); };
  const drive = new ZDrive("id", "s", { apiUrl: "http://127.0.0.1:8080", coreUrl: "http://localhost:3000" });
  await drive.generatePutUrl("a.png");
  await drive.generateDeleteUrl("a-abc12345.png");
  assert.equal(calls[0].href.split("?")[0], "http://127.0.0.1:8080/v1/drive/sign-url");
  assert.equal(calls[1].href.split("?")[0], "http://localhost:3000/api/drive/sign-url");
});
