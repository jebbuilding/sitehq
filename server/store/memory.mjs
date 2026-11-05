// The store interface, and its in-memory implementation (tests and local development).
//
// A store keeps JSON documents addressed by (collection path, document id). It knows nothing about users or rules.
//
//   get(coll, id)             → the document body, or null
//   list(coll)                → [{ id, data }] for every document directly in the collection, by id ascending
//   set(coll, id, data, opts) → replace the whole document (created if missing). opts.ttl = seconds from now after
//                               which the store may drop it (used for connection records; documents never set it)
//   update(coll, id, patch)   → shallow merge of patch into the document (created if missing); resolves the result
//   delete(coll, id)          → remove it (no error if missing; documents nested under its path are not touched)
//
// Collections whose name starts with "$" are the server's own (connections, subscriptions, file records). A client
// can never address them: "$" is not allowed in a path segment (core/paths.mjs).

export function createMemoryStore() {
  const colls = new Map(); // collection path → Map(id → JSON text)
  const clone = (text) => JSON.parse(text);
  return {
    async get(coll, id) {
      const c = colls.get(coll);
      return c && c.has(id) ? clone(c.get(id)) : null;
    },
    async list(coll) {
      const c = colls.get(coll);
      if (!c) return [];
      return [...c.keys()].sort().map((id) => ({ id, data: clone(c.get(id)) }));
    },
    async set(coll, id, data) {
      if (!colls.has(coll)) colls.set(coll, new Map());
      colls.get(coll).set(id, JSON.stringify(data));
    },
    async update(coll, id, patch) {
      if (!colls.has(coll)) colls.set(coll, new Map());
      const c = colls.get(coll), next = Object.assign(c.has(id) ? clone(c.get(id)) : {}, patch);
      c.set(id, JSON.stringify(next));
      return clone(c.get(id));
    },
    async delete(coll, id) {
      const c = colls.get(coll);
      if (c && c.delete(id) && !c.size) colls.delete(coll);
    },
    /** Test and local-dev helper: every document as { "coll/id": data }. Not part of the interface. */
    dump() {
      const out = {};
      for (const [coll, c] of colls) for (const [id, text] of c) out[coll + "/" + id] = clone(text);
      return out;
    },
  };
}
