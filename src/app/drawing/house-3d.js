/* ================= HOUSE 3D: the walls of a plan stood up to their height, with the doors and windows, turned round on screen ================= */
import { $, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
export { hs3View };
/* From 🏘️ on a drawing: each wall becomes a block its thickness and the wall height, the doors and windows show on
   its faces, and the whole thing is drawn from above at an angle (no roof – it's for seeing the shape and where the
   openings fall). ↺ ↻ turn it a quarter, and the picture can be saved to send. Nothing is saved on the drawing. */
const HS3 = { ang: 0 };
function hs3Draw(cv, M, ang) {
  const x = cv.getContext("2d");
  const Wd = cv.width,
    Ht = cv.height;
  x.fillStyle = "#f4f6f8";
  x.fillRect(0, 0, Wd, Ht);
  if (!M || !M.W.length) return;
  const pts = M.W.flatMap((w) => [w.a, w.b]);
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length,
    cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const ca = Math.cos(ang),
    sa = Math.sin(ang);
  const rot = (p) => [(p[0] - cx) * ca - (p[1] - cy) * sa, (p[0] - cx) * sa + (p[1] - cy) * ca];
  /* isometric: across = x − y, down = (x + y)/2 − height */
  const iso2 = (p, z) => [(p[0] - p[1]) * 0.866, (p[0] + p[1]) * 0.5 - z];
  const all = [];
  M.W.forEach((w) => {
    const ra = rot(w.a),
      rb = rot(w.b);
    const L = Math.hypot(rb[0] - ra[0], rb[1] - ra[1]) || 1;
    const u = [(rb[0] - ra[0]) / L, (rb[1] - ra[1]) / L],
      n = [-u[1], u[0]];
    const t = w.T / 2;
    const c = [
      [ra[0] + n[0] * t, ra[1] + n[1] * t],
      [rb[0] + n[0] * t, rb[1] + n[1] * t],
      [rb[0] - n[0] * t, rb[1] - n[1] * t],
      [ra[0] - n[0] * t, ra[1] - n[1] * t],
    ];
    const depth = (ra[0] + ra[1] + rb[0] + rb[1]) / 4;
    all.push({ w, c, u, n, ra, depth, H: w.H });
  });
  /* the size on screen */
  const sp = all.flatMap((o) => o.c.flatMap((p) => [iso2(p, 0), iso2(p, o.H)]));
  const minX = Math.min(...sp.map((p) => p[0])),
    maxX = Math.max(...sp.map((p) => p[0])),
    minY = Math.min(...sp.map((p) => p[1])),
    maxY = Math.max(...sp.map((p) => p[1]));
  const k = Math.min((Wd * 0.88) / (maxX - minX || 1), (Ht * 0.88) / (maxY - minY || 1));
  const ox = Wd / 2 - ((minX + maxX) / 2) * k,
    oy = Ht / 2 - ((minY + maxY) / 2) * k;
  const S = (p, z) => {
    const q = iso2(p, z);
    return [ox + q[0] * k, oy + q[1] * k];
  };
  const poly = (ps, fill, stroke) => {
    x.beginPath();
    ps.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
    x.closePath();
    x.fillStyle = fill;
    x.fill();
    if (stroke) {
      x.strokeStyle = stroke;
      x.lineWidth = 1;
      x.stroke();
    }
  };
  /* the floor shadow */
  all.forEach((o) =>
    poly(
      o.c.map((p) => S(p, 0)),
      "#e2e6ea",
    ),
  );
  /* back to front */
  all.sort((p, q) => p.depth - q.depth);
  all.forEach((o) => {
    /* the four sides: draw the two facing the viewer (+x+y in this view) */
    const faces = [
      [o.c[0], o.c[1]],
      [o.c[1], o.c[2]],
      [o.c[2], o.c[3]],
      [o.c[3], o.c[0]],
    ];
    faces.forEach(([p, q]) => {
      const mx = (p[0] + q[0]) / 2,
        my = (p[1] + q[1]) / 2;
      const cxm = (o.c[0][0] + o.c[2][0]) / 2,
        cym = (o.c[0][1] + o.c[2][1]) / 2;
      const nx = mx - cxm,
        ny = my - cym;
      if (nx + ny <= 0) return;
      const shade = nx > ny ? "#d9c2a0" : "#c8ad86";
      poly([S(p, 0), S(q, 0), S(q, o.H), S(p, o.H)], shade, "#8a7356");
      /* the doors and windows on this face (the long faces only) */
      const along = Math.abs((q[0] - p[0]) * o.u[0] + (q[1] - p[1]) * o.u[1]) > o.w.T;
      if (!along) return;
      o.w.cuts.forEach((ct) => {
        const sgn = (q[0] - p[0]) * o.u[0] + (q[1] - p[1]) * o.u[1] > 0 ? 1 : -1;
        const base = sgn > 0 ? p : q;
        const pt = (t) => [base[0] + o.u[0] * t, base[1] + o.u[1] * t];
        /* t along the wall from its start corner */
        const s0 =
          (base[0] - o.c[sgn > 0 ? 0 : 3][0]) * o.u[0] +
          (base[1] - o.c[sgn > 0 ? 0 : 3][1]) * o.u[1];
        const a1 = pt(ct.t1 - s0),
          a2 = pt(ct.t2 - s0);
        poly(
          [S(a1, ct.sill), S(a2, ct.sill), S(a2, ct.sill + ct.h), S(a1, ct.sill + ct.h)],
          ct.win ? "#9cc3e6" : "#6b5440",
          "#3b2f22",
        );
      });
    });
    poly(
      o.c.map((p) => S(p, o.H)),
      "#eadfcd",
      "#8a7356",
    );
  });
}
function hs3View(M) {
  if (!M) return;
  /* a pop-up over the drawing (the drawing screen sits above the app's own viewer) */
  const d = document.createElement("div");
  d.className = "dimask";
  d.innerHTML = `<div class="dimbox hs3" role="dialog" aria-label="3D view"><b>🧊 3D view from the plan</b><div class="who">The walls ${M.H} mm high with the doors and windows from the plan. No roof – it's for seeing the shape.</div>
    <canvas id="hs3-cv" width="1000" height="700" class="hs3-cv" aria-label="3D view of the walls"></canvas>
    <div class="dimbtns"><button type="button" class="btn" id="hs3-l">↺ Turn</button><button type="button" class="btn" id="hs3-r">↻ Turn</button><button type="button" class="btn" id="hs3-save">⬇ Save the picture</button><button type="button" class="btn primary" id="hs3-x">Close</button></div></div>`;
  document.body.appendChild(d);
  $("hs3-x").onclick = () => d.remove();
  const draw = () => hs3Draw($("hs3-cv"), M, HS3.ang);
  draw();
  $("hs3-l").onclick = () => {
    HS3.ang -= Math.PI / 2;
    draw();
  };
  $("hs3-r").onclick = () => {
    HS3.ang += Math.PI / 2;
    draw();
  };
  $("hs3-save").onclick = async () => {
    const blob = await new Promise((r) => $("hs3-cv").toBlob(r, "image/png"));
    try {
      await S.dl.save({ filename: "3D view.png", data: blob });
    } catch (e) {
      toast("Couldn't save the picture");
    }
  };
}
