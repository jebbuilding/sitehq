/* ================= PHOTO MARK-UP (owner draws / writes and sends back) ================= */
import { bossFirst } from "../core/company-names.js";
import { $, esc, stamp, toast } from "../core/helpers.js";
import { closeForm, formFoot, openSheet, showErr } from "../core/sheet.js";
import { S } from "../core/state.js";
import { render } from "../core/tabs-week.js";
import { askMeasure, drawDim } from "../drawing/notebook.js";
import { blobUrl, uploadErr } from "../files/files.js";
import { newId } from "../files/outbox.js";
import { nameOf } from "../owner/owner.js";
import { loadImage, photoViewer } from "./photos.js";
export { markupBlock, markupSend, openMarkup };
const MK_COLS = ["#e11d2a", "#f2c230", "#ffffff", "#111111", "#2f5fb3"];
function openMarkup(src, onDone, title, opts) {
  opts = opts || {};
  const ov = $("markup");
  ov.hidden = false;
  document.body.style.overflow = "hidden";
  const TOOLS = [
    ["pen", "✎", "Draw"],
    ["line", "／", "Line"],
    ["arrow", "➜", "Arrow"],
    ["dim", "↔", "Measure"],
    ["rect", "▭", "Box"],
    ["circle", "◯", "Circle"],
    ["text", "T", "Text"],
    ["move", "✋", "Select"],
  ];
  ov.innerHTML = `<div class="mk-top"><button type="button" class="btn" id="mk-cancel">Cancel</button><b>${esc(title || "Mark up photo")}</b><button type="button" class="btn primary" id="mk-done">${esc(opts.done || "Next")}</button></div>
    <div class="mk-bar" role="toolbar" aria-label="Drawing tools">
      <div class="mk-row">${TOOLS.map(([k, i, l]) => `<button type="button" class="mk-t" data-t="${k}" aria-pressed="${k === "pen"}" aria-label="${l}">${i}<small>${l}</small></button>`).join("")}</div>
      <div class="mk-row">${MK_COLS.map((c, i) => `<button type="button" class="mk-col" data-c="${c}" aria-label="Colour ${i + 1}" aria-pressed="${c === (opts.col || MK_COLS[0])}" style="background:${c}"></button>`).join("")}
        <span class="mk-ws">${[
          [1, "Fine"],
          [2, "Medium"],
          [3.4, "Thick"],
        ]
          .map(
            ([v, l]) =>
              `<button type="button" class="mk-wb" data-w="${v}" aria-pressed="${v === 2}" aria-label="${l}" title="${l}"><i style="height:${v * 2}px"></i></button>`,
          )
          .join("")}</span>
        <button type="button" class="mk-t mk-s" id="mk-undo" aria-label="Undo">↶<small>Undo</small></button><button type="button" class="mk-t mk-s" id="mk-redo" aria-label="Redo">↷<small>Redo</small></button><button type="button" class="mk-t mk-s" id="mk-snap" aria-pressed="true" aria-label="Snap lines">🧲<small>Snap</small></button><button type="button" class="mk-t mk-s" id="mk-fit" aria-label="Fit photo">⤢<small>Fit</small></button><button type="button" class="mk-t mk-s mk-del" id="mk-del" hidden aria-label="Delete">🗑<small>Delete</small></button></div></div>
    <div class="mk-stage" id="mk-stage"><canvas id="mk-cv" aria-label="Photo. Draw on it with your finger."></canvas><div class="mk-load" id="mk-load">Loading photo…</div></div>
    <div class="who mk-hint" id="mk-hint">Draw with your finger. Two fingers to zoom in and move around.</div>`;
  const stage = $("mk-stage"),
    cv = $("mk-cv"),
    g = cv.getContext("2d");
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  let snapOn = true,
    img = null,
    tool = "pen",
    col = opts.col || MK_COLS[0],
    wk = 2,
    ops = [],
    cur = null,
    sel = null,
    drag = null,
    undo = [],
    redo = [],
    s = 1,
    ox = 0,
    oy = 0,
    IW = 1,
    IH = 1;
  const close = () => {
    window.removeEventListener("resize", size);
    ov.hidden = true;
    ov.innerHTML = "";
    document.body.style.overflow = "";
  };
  const base = () => Math.max(IW, IH);
  const lw = () => Math.max(3, Math.round(base() * 0.004 * wk));
  const snap = () => {
    undo.push(JSON.stringify(ops));
    if (undo.length > 60) undo.shift();
    redo = [];
  };
  const fit = () => {
    const r = stage.getBoundingClientRect();
    s = Math.min(r.width / IW, r.height / IH);
    ox = (r.width - IW * s) / 2;
    oy = (r.height - IH * s) / 2;
    draw();
  };
  const size = () => {
    const r = stage.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    cv.style.width = r.width + "px";
    cv.style.height = r.height + "px";
    draw();
  };
  const toImg = (e) => {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left - ox) / s, (e.clientY - r.top - oy) / s];
  };
  const fsz = (o) => Math.round(base() * (o.big ? 0.045 : 0.032));
  function textBox(ctx, o) {
    const fs = fsz(o);
    ctx.font = `700 ${fs}px system-ui, sans-serif`;
    const tw = ctx.measureText(o.s).width,
      pd = fs * 0.3;
    return [o.p[0][0] - pd, o.p[0][1] - pd, tw + pd * 2, fs + pd * 2];
  }
  function drawOp(ctx, o) {
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = o.c;
    ctx.lineWidth = o.w;
    ctx.lineCap = ctx.lineJoin = "round";
    if (o.t === "pen") {
      ctx.beginPath();
      o.p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      if (o.p.length === 1) ctx.lineTo(o.p[0][0] + 0.1, o.p[0][1]);
      ctx.stroke();
    } else if (o.t === "line") {
      const [a, b] = o.p;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    } else if (o.t === "dim") {
      drawDim(ctx, o.p[0], o.p[1], o.c, o.w, o.s || "", Math.round(base() * 0.028));
    } else if (o.t === "rect") {
      const [a, b] = o.p;
      ctx.strokeRect(
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.abs(b[0] - a[0]),
        Math.abs(b[1] - a[1]),
      );
    } else if (o.t === "circle") {
      const [a, b] = o.p;
      ctx.beginPath();
      ctx.ellipse(
        (a[0] + b[0]) / 2,
        (a[1] + b[1]) / 2,
        Math.abs(b[0] - a[0]) / 2 + 1,
        Math.abs(b[1] - a[1]) / 2 + 1,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else if (o.t === "arrow") {
      const [a, b] = o.p;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]),
        h = o.w * 4;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - h * Math.cos(ang - 0.45), b[1] - h * Math.sin(ang - 0.45));
      ctx.lineTo(b[0] - h * Math.cos(ang + 0.45), b[1] - h * Math.sin(ang + 0.45));
      ctx.closePath();
      ctx.fill();
    } else if (o.t === "text") {
      const [x, y, w, h] = textBox(ctx, o);
      ctx.textBaseline = "top";
      ctx.fillStyle =
        o.c === "#111111" || o.c === "#2f5fb3" || o.c === "#e11d2a"
          ? "rgba(255,255,255,.85)"
          : "rgba(0,0,0,.6)";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = o.c;
      ctx.fillText(o.s, o.p[0][0], o.p[0][1]);
    }
    ctx.restore();
  }
  function bbox(o) {
    if (o.t === "text") return textBox(g, o);
    const xs = o.p.map((q) => q[0]),
      ys = o.p.map((q) => q[1]);
    const m = o.w / 2;
    return [
      Math.min(...xs) - m,
      Math.min(...ys) - m,
      Math.max(...xs) - Math.min(...xs) + 2 * m,
      Math.max(...ys) - Math.min(...ys) + 2 * m,
    ];
  }
  function draw() {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#0d0b0b";
    g.fillRect(0, 0, cv.width, cv.height);
    if (!img) return;
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    g.drawImage(img, 0, 0, IW, IH);
    ops.forEach((o) => drawOp(g, o));
    if (cur) drawOp(g, cur);
    const o = sel != null ? ops[sel] : null;
    if (o) {
      const [x, y, w, h] = bbox(o);
      g.save();
      g.setLineDash([10 / s, 8 / s]);
      g.lineWidth = 2 / s;
      g.strokeStyle = "#4f8cff";
      g.strokeRect(x - 6 / s, y - 6 / s, w + 12 / s, h + 12 / s);
      g.setLineDash([]);
      if (o.t !== "pen" && o.t !== "text")
        o.p.forEach((q) => {
          g.beginPath();
          g.arc(q[0], q[1], 13 / s, 0, 7);
          g.fillStyle = "#fff";
          g.fill();
          g.lineWidth = 3 / s;
          g.strokeStyle = "#4f8cff";
          g.stroke();
        });
      g.restore();
    }
    $("mk-del").hidden = sel == null;
  }
  const two = (o) => o && ["line", "arrow", "dim", "rect", "circle"].includes(o.t);
  function snapEnd(p, skip) {
    if (!snapOn) return p;
    let best = null,
      bd = 20 / s;
    ops.forEach((o, i) => {
      if (i === skip || !two(o)) return;
      const pts = o.p.slice();
      if (o.t === "rect") pts.push([o.p[0][0], o.p[1][1]], [o.p[1][0], o.p[0][1]]);
      pts.forEach((q) => {
        const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d < bd) {
          bd = d;
          best = q;
        }
      });
    });
    return best ? [best[0], best[1]] : p;
  }
  function ortho(a, b) {
    if (!snapOn) return b;
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const an = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI) % 90;
    if (an < 7 || an > 83) return Math.abs(dx) > Math.abs(dy) ? [b[0], a[1]] : [a[0], b[1]];
    return b;
  }
  const snapB = (o, p, skip) => {
    let b = snapEnd(p, skip);
    if (b === p && ["line", "arrow", "dim"].includes(o.t)) b = ortho(o.p[0], p);
    return b;
  };
  const dSeg = (p, a, b) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      l = dx * dx + dy * dy || 1;
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  function hit(p) {
    const tol = 16 / s;
    for (let i = ops.length - 1; i >= 0; i--) {
      const o = ops[i];
      const [x, y, w, h] = bbox(o);
      if (p[0] < x - tol || p[0] > x + w + tol || p[1] < y - tol || p[1] > y + h + tol) continue;
      if (o.t === "text" || o.t === "rect" || o.t === "circle") return i;
      if (o.p.length === 1) return i;
      for (let k = 1; k < o.p.length; k++)
        if (dSeg(p, o.p[k - 1], o.p[k]) < o.w / 2 + tol) return i;
    }
    return null;
  }
  function askText(cb, cur0) {
    const d = document.createElement("div");
    d.className = "dimask";
    d.innerHTML = `<form class="dimbox"><b>T Write a note</b><input maxlength="80" class="mkti" placeholder="e.g. Move socket here" value="${esc(cur0 || "")}"><label class="inl" style="margin-top:6px;color:var(--ink)"><input type="checkbox" class="mktb"> Big writing</label><div class="dimbtns"><button type="button" class="btn mktx">Cancel</button><button type="submit" class="btn primary">Add</button></div></form>`;
    ov.appendChild(d);
    const inp = d.querySelector(".mkti");
    setTimeout(() => inp.focus(), 30);
    d.querySelector(".mktx").onclick = () => d.remove();
    d.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const t = inp.value.trim();
      d.remove();
      if (t) cb(t, d.querySelector(".mktb").checked);
    };
  }
  const ptrs = new Map();
  let pinch = null;
  cv.addEventListener("pointerdown", (e) => {
    if (!img) return;
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) {
      cur = null;
      drag = null;
      const [a, b] = [...ptrs.values()];
      pinch = {
        d: Math.hypot(a[0] - b[0], a[1] - b[1]),
        mx: (a[0] + b[0]) / 2,
        my: (a[1] + b[1]) / 2,
        s,
        ox,
        oy,
      };
      draw();
      return;
    }
    if (ptrs.size > 2) return;
    const p = toImg(e);
    if (tool === "text") {
      askText((t, big) => {
        snap();
        ops.push({ t: "text", c: col, w: 0, p: [p], s: t, big });
        draw();
      });
      return;
    }
    if (tool === "move") {
      const o = sel != null ? ops[sel] : null;
      if (o && o.t !== "pen" && o.t !== "text") {
        const k = o.p.findIndex((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 30 / s);
        if (k >= 0) {
          snap();
          drag = { k: "end", i: sel, n: k };
          return;
        }
      }
      const i = hit(p);
      if (i != null && i === sel && ops[i].t === "dim") {
        const od = ops[i];
        askMeasure(ov, od.s || "", (v) => {
          if (v !== null) {
            snap();
            od.s = v;
          }
          draw();
        });
        return;
      }
      if (i != null && i === sel && ops[i].t === "text") {
        const ot = ops[i];
        askText((t, big) => {
          snap();
          ot.s = t;
          ot.big = big;
          draw();
        }, ot.s);
        return;
      }
      if (i != null) {
        sel = i;
        snap();
        drag = { k: "move", i, st: p, o: JSON.parse(JSON.stringify(ops[i])) };
        draw();
        return;
      }
      sel = null;
      drag = { k: "pan", sx: e.clientX, sy: e.clientY, ox, oy };
      draw();
      return;
    }
    sel = null;
    const sp = tool === "pen" ? p : snapEnd(p);
    cur = {
      t: tool,
      c: tool === "dim" ? "#e11d2a" : col,
      w: lw(),
      p: tool === "pen" ? [p] : [sp, sp],
    };
    draw();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]),
        mx = (a[0] + b[0]) / 2,
        my = (a[1] + b[1]) / 2;
      const r = cv.getBoundingClientRect();
      const ns = Math.max(0.02, Math.min(8, (pinch.s * d) / pinch.d));
      const px = (pinch.mx - r.left - pinch.ox) / pinch.s,
        py = (pinch.my - r.top - pinch.oy) / pinch.s;
      s = ns;
      ox = mx - r.left - px * ns;
      oy = my - r.top - py * ns;
      draw();
      return;
    }
    const p = toImg(e);
    if (drag) {
      if (drag.k === "pan") {
        ox = drag.ox + (e.clientX - drag.sx);
        oy = drag.oy + (e.clientY - drag.sy);
        draw();
        return;
      }
      const o = ops[drag.i];
      if (drag.k === "end") {
        let q = snapEnd(p, drag.i);
        if (q === p && ["line", "arrow", "dim"].includes(o.t)) q = ortho(o.p[1 - drag.n], p);
        o.p[drag.n] = q;
      } else {
        const dx = p[0] - drag.st[0],
          dy = p[1] - drag.st[1];
        o.p = drag.o.p.map((q) => [q[0] + dx, q[1] + dy]);
      }
      draw();
      return;
    }
    if (!cur) return;
    if (cur.t === "pen") cur.p.push(p);
    else cur.p[1] = snapB(cur, p);
    draw();
  });
  const end = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (cur && ptrs.size === 0) {
      const was = cur;
      cur = null;
      const L =
        was.p.length > 1 ? Math.hypot(was.p[1][0] - was.p[0][0], was.p[1][1] - was.p[0][1]) : 0;
      if (was.t !== "pen" && L < 8 / s) {
        draw();
        return;
      }
      snap();
      ops.push(was);
      draw();
      if (was.t === "dim")
        askMeasure(ov, "", (v) => {
          if (v) was.s = v;
          draw();
        });
    }
    if (ptrs.size === 0) drag = null;
  };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);
  cv.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      const ns = Math.max(0.02, Math.min(8, s * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      const px = (e.clientX - r.left - ox) / s,
        py = (e.clientY - r.top - oy) / s;
      s = ns;
      ox = e.clientX - r.left - px * s;
      oy = e.clientY - r.top - py * s;
      draw();
    },
    { passive: false },
  );
  const hints = {
    pen: "Draw with your finger. Two fingers to zoom in and move around.",
    text: "Tap the photo where the note goes, then type it.",
    move: "Tap something to select it. Drag to move it, or drag the white dots to adjust it. Tap a measurement again to change it.",
    dim: "Drag along what you're measuring, then type the size.",
  };
  ov.querySelectorAll(".mk-t[data-t]").forEach(
    (b) =>
      (b.onclick = () => {
        tool = b.dataset.t;
        ov.querySelectorAll(".mk-t[data-t]").forEach((x) =>
          x.setAttribute("aria-pressed", String(x === b)),
        );
        if (tool !== "move") sel = null;
        $("mk-hint").textContent = hints[tool] || "Drag across the photo.";
        draw();
      }),
  );
  ov.querySelectorAll(".mk-col").forEach(
    (b) =>
      (b.onclick = () => {
        col = b.dataset.c;
        ov.querySelectorAll(".mk-col").forEach((x) =>
          x.setAttribute("aria-pressed", String(x === b)),
        );
        if (sel != null && ops[sel] && ops[sel].t !== "dim") {
          snap();
          ops[sel].c = col;
          draw();
        }
      }),
  );
  ov.querySelectorAll(".mk-wb").forEach(
    (b) =>
      (b.onclick = () => {
        wk = +b.dataset.w;
        ov.querySelectorAll(".mk-wb").forEach((x) =>
          x.setAttribute("aria-pressed", String(x === b)),
        );
        if (sel != null && ops[sel] && ops[sel].t !== "text") {
          snap();
          ops[sel].w = lw();
          draw();
        }
      }),
  );
  $("mk-undo").onclick = () => {
    if (!undo.length) return;
    redo.push(JSON.stringify(ops));
    ops = JSON.parse(undo.pop());
    sel = null;
    draw();
  };
  $("mk-redo").onclick = () => {
    if (!redo.length) return;
    undo.push(JSON.stringify(ops));
    ops = JSON.parse(redo.pop());
    sel = null;
    draw();
  };
  $("mk-fit").onclick = fit;
  $("mk-snap").onclick = () => {
    snapOn = !snapOn;
    $("mk-snap").setAttribute("aria-pressed", String(snapOn));
    toast(snapOn ? "Snap on: lines straighten and join up" : "Snap off: draw freely");
  };
  $("mk-del").onclick = () => {
    if (sel == null) return;
    snap();
    ops.splice(sel, 1);
    sel = null;
    draw();
  };
  $("mk-cancel").onclick = close;
  $("mk-done").onclick = () => {
    if (!img) return;
    if (!ops.length) {
      toast("Draw or write something first");
      return;
    }
    const oc = document.createElement("canvas");
    oc.width = IW;
    oc.height = IH;
    const og = oc.getContext("2d");
    og.drawImage(img, 0, 0, IW, IH);
    ops.forEach((o) => drawOp(og, o));
    oc.toBlob(
      (b) => {
        if (!b) {
          toast("Couldn't save the drawing");
          return;
        }
        close();
        onDone(b);
      },
      "image/jpeg",
      0.88,
    );
  };
  window.addEventListener("resize", size);
  (async () => {
    try {
      const blob = src instanceof Blob ? src : await (await fetch(src)).blob();
      img = await loadImage(blob);
      const sc = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
      IW = Math.round(img.naturalWidth * sc);
      IH = Math.round(img.naturalHeight * sc);
      const l = $("mk-load");
      if (l) l.remove();
      size();
      fit();
    } catch (e) {
      const l = $("mk-load");
      if (l) l.textContent = "Couldn't open the photo. Check your connection.";
    }
  })();
  size();
}
function markupSend(p, who) {
  if (!S.assets) {
    toast("Uploads aren't available here");
    return;
  }
  openMarkup(
    blobUrl(p.assetId),
    (blob) => {
      const url = URL.createObjectURL(blob);
      openSheet(
        `<h3 id="sheettitle">Send back to ${esc(nameOf(who))}</h3>
      <img src="${url}" alt="Your marked-up photo" style="max-height:40vh;max-width:100%;border-radius:8px;align-self:center">
      <label for="mk-note">Message (optional)<textarea id="mk-note" maxlength="400" placeholder="e.g. Move this outlet 300mm to the left, as marked."></textarea></label>
      <label class="inl" style="font-size:15px;color:var(--ink);font-weight:500"><input type="checkbox" id="mk-ask" checked> Pop it up on their phone and ask them to look at it</label>
      ${formFoot(false, "Send to " + nameOf(who).split(" ")[0])}`,
        async () => {
          $("f-save").disabled = true;
          try {
            const a = await S.assets.upload(new File([blob], "markup.jpg", { type: "image/jpeg" }));
            const note = $("mk-note").value.trim();
            const mk = { assetId: a.id, note, created: Date.now() };
            const marks = (p.markups || []).concat([mk]);
            await S.db.doc("sheets/" + who + "/photos/" + p.id).update({ markups: marks });
            p.markups = marks;
            if ($("mk-ask").checked)
              await S.db.doc("sheets/" + who + "/signoffs/pr-" + newId()).set({
                type: "prompt",
                form: "markup",
                ref: p.id,
                refLabel: p.site || "",
                note,
                status: "open",
                created: Date.now(),
              });
            URL.revokeObjectURL(url);
            closeForm();
            toast("Sent to " + nameOf(who));
            render();
            photoViewer(p, true, who);
          } catch (e) {
            showErr(uploadErr(e));
            $("f-save").disabled = false;
          }
        },
        "mk-note",
      );
    },
    "Mark up: " + (p.site || "photo"),
  );
}
function markupBlock(p, owner) {
  const ms = p.markups || [];
  if (!ms.length) return "";
  return `<div class="mkblock"><div class="flabel" style="margin:0">${owner ? "Your mark-ups sent back" : `${bossFirst()}'s notes on this photo`}</div>
    ${ms.map((m, i) => `<div class="mkitem"><img src="${blobUrl(m.assetId)}" alt="Marked-up photo ${i + 1}"><div>${m.note ? `<b>${esc(m.note)}</b><br>` : ""}<span class="who">${owner ? "Sent" : `From ${bossFirst()}`} ${stamp(m.created)}</span><br><button type="button" class="pillbtn mk-save" data-a="${esc(m.assetId)}">Save</button></div></div>`).join("")}</div>`;
}
