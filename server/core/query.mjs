// The little querying the app does, applied in the API after a collection is read: equality filters on top-level
// fields, one orderBy, a limit. Without orderBy the order is by document id, ascending.
import { invalid } from "./errors.mjs";

const scalar = (v) => v === null || ["string", "number", "boolean"].includes(typeof v);

/** Check a query sent by a client and return it in a fixed shape. */
export function parseQuery(q) {
  const out = { where: [], orderBy: null, limit: 0 };
  if (q === undefined || q === null) return out;
  if (typeof q !== "object" || Array.isArray(q)) throw invalid("query must be an object");
  if (q.where !== undefined) {
    if (!Array.isArray(q.where) || q.where.length > 10) throw invalid("where must be a list of at most 10 filters");
    for (const w of q.where) {
      if (!Array.isArray(w) || w.length !== 3 || typeof w[0] !== "string" || !w[0]) throw invalid("a filter is [field, op, value]");
      if (w[1] !== "==") throw invalid('only the "==" filter is supported');
      if (!scalar(w[2])) throw invalid("a filter value must be a string, number, boolean or null");
      out.where.push([w[0], "==", w[2]]);
    }
  }
  if (q.orderBy !== undefined && q.orderBy !== null) {
    const o = q.orderBy;
    if (!Array.isArray(o) || typeof o[0] !== "string" || !o[0] || !["asc", "desc", undefined].includes(o[1])) throw invalid('orderBy is [field, "asc" | "desc"]');
    out.orderBy = [o[0], o[1] || "asc"];
  }
  if (q.limit !== undefined && q.limit !== null && q.limit !== 0) {
    if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 1000) throw invalid("limit must be a whole number from 1 to 1000");
    out.limit = q.limit;
  }
  return out;
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Filter, sort and cut a list of `{id, data}`. Documents missing the orderBy field sort last, in id order. */
export function applyQuery(docs, q) {
  let out = docs.filter((d) => q.where.every(([field, , value]) => d.data[field] === value));
  out.sort(byId);
  if (q.orderBy) {
    const [field, dir] = q.orderBy, sign = dir === "desc" ? -1 : 1;
    const missing = (d) => d.data[field] === undefined || d.data[field] === null;
    out.sort((a, b) => {
      if (missing(a) || missing(b)) return missing(a) - missing(b);
      const x = a.data[field], y = b.data[field];
      return x < y ? -sign : x > y ? sign : 0;
    });
  }
  if (q.limit) out = out.slice(0, q.limit);
  return out;
}
