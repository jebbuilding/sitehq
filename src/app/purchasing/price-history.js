/* ================= PRICE HISTORY: what each material has cost from each merchant over time – what's gone up, and who's cheapest now ================= */
import { $, esc, gbp } from "../core/helpers.js";
import { S } from "../core/state.js";
import { openViewer } from "../core/viewer.js";
import { plSupName } from "./price-order.js";
export { PHI };
/* James (Nov 2026, "do them all" – idea 3): Merchants › Price lists › 📈 Price history. Every item on the merchants'
   price lists and every line on a purchase order, with the price each time it changed (oldest first), who's cheapest
   now, and how much it has gone up or down over the last 3 and 12 months. "Gone up" shows only the ones that rose.
   Tap one for its whole history by merchant. Prices come from: each saved price list (the list keeps its own
   history: hist { item key: [[at, £]] }, added to by plSave when a price changes – owner-only like the lists) and
   the purchase orders (lines' prices on the day they were made). All before VAT. */
const PHI = (() => {
  const key = (n) =>
    String(n || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  /* plSave calls this: the new list's hist, with a point added for each price that changed */
  function histFor(old, items, now) {
    const h = Object.assign({}, (old && old.hist) || {});
    const was = new Map(((old && old.items) || []).map((x) => [key(x.n), +x.p || 0]));
    items.forEach((x) => {
      const k = key(x.n),
        p = +x.p || 0;
      if (!k || !p) return;
      const L = (h[k] || []).slice();
      /* the price it had before history was kept goes in first, dated when that list was saved */
      if (!L.length && was.get(k) > 0 && was.get(k) !== p)
        L.push([(old && old.updated) || now - 1, was.get(k)]);
      if (!L.length || L[L.length - 1][1] !== p) L.push([now, p]);
      h[k] = L.slice(-24);
    });
    return h;
  }
  /* every item: { k, name, unit, by: { sup: [[at, £, from]] } } */
  function items() {
    const M = new Map();
    const add = (name, unit, sup, at, p, from) => {
      const k = key(name);
      if (!k || !(p > 0)) return;
      const it = M.get(k) || { k, name, unit: unit || "", by: {} };
      if (!it.unit && unit) it.unit = unit;
      (it.by[sup] = it.by[sup] || []).push([at, p, from]);
      M.set(k, it);
    };
    (S.priceLists || []).forEach((l) => {
      const h = l.hist || {};
      (l.items || []).forEach((x) => {
        const H = h[key(x.n)];
        if (H && H.length) H.forEach(([at, p]) => add(x.n, x.u, l.sup, at, p, "list"));
        else add(x.n, x.u, l.sup, l.updated || 0, +x.p || 0, "list");
      });
    });
    (S.purchaseOrders || []).forEach((o) =>
      (o.lines || []).forEach((x) =>
        add(x.d, x.u, o.sup || "", o.created || 0, +x.p || 0, o.number || "order"),
      ),
    );
    return [...M.values()].map((it) => {
      Object.values(it.by).forEach((L) => L.sort((a, b) => a[0] - b[0]));
      return it;
    });
  }
  /* the price from a merchant at a time: the last one on or before it */
  const at = (L, t) => {
    let p = null;
    L.forEach((x) => {
      if (x[0] <= t) p = x[1];
    });
    return p;
  };
  /* the item's change over the last `days`, as a % (the average over merchants that had a price then and now) */
  function change(it, days) {
    const t0 = Date.now() - days * 864e5;
    const ch = Object.values(it.by)
      .map((L) => {
        const a = at(L, t0),
          b = L[L.length - 1][1];
        return a > 0 ? ((b - a) / a) * 100 : null;
      })
      .filter((x) => x != null);
    return ch.length ? ch.reduce((s, x) => s + x, 0) / ch.length : null;
  }
  const latest = (it) =>
    Object.entries(it.by)
      .map(([sup, L]) => ({ sup, p: L[L.length - 1][1], at: L[L.length - 1][0] }))
      .sort((a, b) => a.p - b.p);
  const pct = (x) =>
    x == null ? "" : (x > 0 ? "▲ " : x < 0 ? "▼ " : "") + Math.abs(Math.round(x * 10) / 10) + "%";
  const supName = (s) => (s ? plSupName(s) : "No merchant");
  let st = { q: "", up: false };
  function open() {
    const all = items().sort((a, b) => a.name.localeCompare(b.name));
    const f = key(st.q);
    const L = all.filter(
      (it) => (!f || it.k.includes(f)) && (!st.up || (change(it, 365) || 0) > 0.5),
    );
    openViewer(`<div class="phi"><div class="vhead"><b>📈 Price history</b></div>
      <div class="who">What each material has cost from each merchant, from your price lists and orders, before VAT. ▲ is how much it's gone up.</div>
      <input id="phi-q" type="search" placeholder="Find a material, e.g. plasterboard" value="${esc(st.q)}" aria-label="Find a material">
      <label class="inl"><input type="checkbox" id="phi-up"${st.up ? " checked" : ""}> Only ones that have gone up this year</label>
      ${
        L.map((it) => {
          const lt = latest(it);
          const c3 = change(it, 91),
            c12 = change(it, 365);
          return `<button type="button" class="incrow phi-it" data-k="${esc(it.k)}"><span><b>${esc(it.name)}</b>${it.unit ? ` <span class="who">per ${esc(it.unit)}</span>` : ""}<br><span class="who">Cheapest now ${esc(gbp(lt[0].p))} at ${esc(supName(lt[0].sup))}${lt.length > 1 ? " · " + lt.length + " merchants" : ""}</span></span><span class="phi-ch">${c3 != null && Math.abs(c3) >= 0.5 ? `<span class="tag ${c3 > 0 ? "bad" : "ok"}">${esc(pct(c3))} 3 mths</span>` : ""}${c12 != null && Math.abs(c12) >= 0.5 ? `<span class="tag ${c12 > 0 ? "bad" : "ok"}">${esc(pct(c12))} 12 mths</span>` : ""}</span></button>`;
        }).join("") ||
        `<div class="empty"><strong>${all.length ? "Nothing matches" : "No prices yet"}</strong>${all.length ? "" : "Prices come from your merchants' price lists and your orders. Each time a price list is updated, the old price is kept here."}</div>`
      }</div>`);
    let tm = null;
    $("phi-q").oninput = (e) => {
      clearTimeout(tm);
      tm = setTimeout(() => {
        st.q = e.target.value;
        open();
        const el = $("phi-q");
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 300);
    };
    $("phi-up").onchange = (e) => {
      st.up = e.target.checked;
      open();
    };
    document
      .querySelectorAll(".phi-it")
      .forEach((b) => (b.onclick = () => one(all.find((x) => x.k === b.dataset.k))));
  }
  function one(it) {
    if (!it) return;
    const d = document.createElement("div");
    d.className = "dimask";
    d.style.zIndex = "150";
    const lt = latest(it);
    d.innerHTML = `<div class="dimbox phi-one" role="dialog" aria-label="${esc(it.name)}"><b>📈 ${esc(it.name)}</b>${it.unit ? `<div class="who">per ${esc(it.unit)}, before VAT</div>` : ""}
      ${lt
        .map(
          (x, i) =>
            `<div class="flabel">${i === 0 && lt.length > 1 ? "✓ Cheapest: " : ""}${esc(supName(x.sup))} – ${esc(gbp(x.p))}</div>${it.by[
              x.sup
            ]
              .slice()
              .reverse()
              .map((y, j, R) => {
                const prev = R[j + 1];
                const c = prev && prev[1] > 0 ? ((y[1] - prev[1]) / prev[1]) * 100 : null;
                return `<div class="phi-row"><span>${esc(new Date(y[0]).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))}</span><span>${esc(gbp(y[1]))}</span><span class="who">${c != null && Math.abs(c) >= 0.5 ? esc(pct(c)) : ""}${y[2] && y[2] !== "list" ? " · order " + esc(y[2]) : ""}</span></div>`;
              })
              .join("")}`,
        )
        .join("")}
      <div class="dimbtns"><button type="button" class="btn phi-x">Close</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector(".phi-x").onclick = () => d.remove();
  }
  return { histFor, items, change, open };
})();
