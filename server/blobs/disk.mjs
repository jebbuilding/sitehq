// The file store interface, and its local-disk implementation (local development and tests).
//
// A file store keeps the bytes of uploaded files by id. Who uploaded what, its type and size are records in the
// document store ("$assets"), written by the API – the file store only moves bytes.
//
//   uploadTarget(id, { contentType, size }) → { url, method, headers } the browser sends the bytes to, or null
//                                             when the bytes should be sent to the API itself (PUT …/content)
//   put(id, bytes, contentType)             → store bytes directly (API-side upload, seeding)
//   stat(id)                                → { size } or null if nothing is stored under the id
//   read(id)                                → the bytes (a Buffer) or null
//   url(id, { contentType })                → a short-lived link straight to the file, or null if there is no
//                                             such thing here (the API then serves the bytes itself)
//   delete(id)                              → remove it (no error if missing)
import fs from "node:fs/promises";
import path from "node:path";

const ID = /^[\w-]{1,64}$/;

export function createDiskBlobs(dir) {
  const file = (id) => {
    if (!ID.test(id)) throw new Error("bad file id");
    return path.join(dir, id);
  };
  const missing = (e) => { if (e.code === "ENOENT") return null; throw e; };
  return {
    async uploadTarget() { return null; },
    async put(id, bytes) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file(id), bytes);
    },
    async stat(id) {
      const s = await fs.stat(file(id)).catch(missing);
      return s ? { size: s.size } : null;
    },
    async read(id) { return fs.readFile(file(id)).catch(missing); },
    async url() { return null; },
    async delete(id) { await fs.rm(file(id), { force: true }); },
  };
}
