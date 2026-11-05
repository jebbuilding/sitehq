// Document paths, with the same grammar as the platform the app was written for (platform/types/db.d.ts › PATH
// GRAMMAR): slash-separated segments; an even number of segments is a document, an odd number a collection.
import { invalid } from "./errors.mjs";

const SEGMENT = /^[A-Za-z0-9_\-.~:@+]+$/;
const bytes = (s) => Buffer.byteLength(s, "utf8");

/** The segments of a path, or an `invalid_argument` ApiError saying which rule it breaks. */
export function parsePath(path) {
  if (typeof path !== "string" || !path) throw invalid("path must be a non-empty string");
  if (bytes(path) > 1000) throw invalid("path is longer than 1000 bytes");
  const segs = path.split("/");
  if (segs.length > 16) throw invalid("path has more than 16 segments");
  for (const s of segs) {
    if (!SEGMENT.test(s) || s === "." || s === "..") throw invalid("path segments use letters, digits and _ - . ~ : @ + only");
    if (bytes(s) > 200) throw invalid("a path segment is longer than 200 bytes");
  }
  return segs;
}

/** Segments of a document path (even length), split into its collection path and id. */
export function parseDocPath(path) {
  const segs = parsePath(path);
  if (segs.length % 2) throw invalid("a document path has an even number of segments");
  return { segs, coll: segs.slice(0, -1).join("/"), id: segs[segs.length - 1] };
}

/** Segments of a collection path (odd length). */
export function parseCollPath(path) {
  const segs = parsePath(path);
  if (segs.length % 2 === 0) throw invalid("a collection path has an odd number of segments");
  return { segs, coll: path };
}
