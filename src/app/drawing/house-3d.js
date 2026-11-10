/* ================= HOUSE 3D: the walls of a plan stood up, storey on storey, with the doors, windows and the roof, turned round on screen ================= */
import { $, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
export { hs3View };
/* From 🏘️ on a drawing: each wall becomes a block its thickness and the storey height, the doors and windows show on
   its faces, upper storeys sit on top, and the roof chosen in 🏘️ (gable, hipped, lean-to or flat, at its pitch and
   overhang) goes over the top. Drawn from above at an angle; ↺ ↻ turn it a quarter, and the picture can be saved to
   send. The wall colour follows the finish (brick, render, cladding). Nothing is saved on the drawing. */
const HS3 = { ang: 0 };
const HS3_COL = {
  brick: ["#c98b6b", "#b5775a", "#8a5440"],
  render: ["#ece6da", "#d9d1c2", "#9e9482"],
  clad: ["#a9b7a2", "#93a28c", "#5f6d5a"],
  none: ["#d9c2a0", "#c8ad86", "#8a7356"],
};
function hs3Draw(cv, B, ang) {
  const x = cv.getContext("2d");
  const Wd = cv.width,
    Ht = cv.height;
  x.fillStyle = "#f4f6f8";
  x.fillRect(0, 0, Wd, Ht);
  if (!B || !B.storeys || !B.storeys.length) return;
  const [cLight, cDark, cLine] = HS3_COL[(B.st && B.st.finish) || "none"] || HS3_COL.none;
  const bx = B.box;
  const cx = (bx.x0 + bx.x1) / 2,
    cy = (bx.y0 + bx.y1) / 2;
  const ca = Math.cos(ang),
    sa = Math.sin(ang);
  const rot = (p) => [(p[0] - cx) * ca - (p[1] - cy) * sa, (p[0] - cx) * sa + (p[1] - cy) * ca];
  /* isometric: across = x − y, down = (x + y)/2 − height */
  const iso2 = (p, z) => [(p[0] - p[1]) * 0.866, (p[0] + p[1]) * 0.5 - z];
  const all = [];
  B.storeys.forEach((s) =>
    s.W.forEach((w) => {
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
      all.push({ w, c, u, z0: s.z, H: s.h || w.H, depth: (ra[0] + ra[1] + rb[0] + rb[1]) / 4 });
    }),
  );
  /* the roof's faces, in plan corners and heights */
  const R = B.roof || { type: "none" };
  const E = B.E,
    o = R.over || 0,
    rise = R.rise || 0;
  const X0 = bx.x0 - o,
    X1 = bx.x1 + o,
    Y0 = bx.y0 - o,
    Y1 = bx.y1 + o;
  const faces = [];
  const F = (pts, fill) => faces.push({ pts, fill });
  if (R.type === "flat")
    F(
      [
        [bx.x0, bx.y0, E + 250],
        [bx.x1, bx.y0, E + 250],
        [bx.x1, bx.y1, E + 250],
        [bx.x0, bx.y1, E + 250],
      ],
      "#6b7280",
    );
  else if (R.type === "lean") {
    F(
      [
        [X0, Y1, E],
        [X1, Y1, E],
        [X1, bx.y0, E + rise],
        [X0, bx.y0, E + rise],
      ],
      "#7c4a3a",
    );
    F(
      [
        [bx.x0, bx.y0, E],
        [bx.x1, bx.y0, E],
        [bx.x1, bx.y0, E + rise],
        [bx.x0, bx.y0, E + rise],
      ],
      cLight,
    );
    F(
      [
        [bx.x0, bx.y1, E],
        [bx.x0, bx.y0, E],
        [bx.x0, bx.y0, E + rise],
      ],
      cDark,
    );
    F(
      [
        [bx.x1, bx.y1, E],
        [bx.x1, bx.y0, E],
        [bx.x1, bx.y0, E + rise],
      ],
      cDark,
    );
  } else if (R.type === "gable" || R.type === "hip") {
    const hip = R.type === "hip";
    if (R.ax === "x") {
      const ym = (bx.y0 + bx.y1) / 2,
        h = hip ? Math.min((bx.x1 - bx.x0) / 2, (bx.y1 - bx.y0) / 2) : 0;
      F(
        [
          [X0, Y1, E],
          [X1, Y1, E],
          [hip ? bx.x1 - h : X1, ym, E + rise],
          [hip ? bx.x0 + h : X0, ym, E + rise],
        ],
        "#7c4a3a",
      );
      F(
        [
          [X0, Y0, E],
          [X1, Y0, E],
          [hip ? bx.x1 - h : X1, ym, E + rise],
          [hip ? bx.x0 + h : X0, ym, E + rise],
        ],
        "#6e4033",
      );
      if (hip) {
        F(
          [
            [X0, Y0, E],
            [X0, Y1, E],
            [bx.x0 + h, ym, E + rise],
          ],
          "#653a2e",
        );
        F(
          [
            [X1, Y0, E],
            [X1, Y1, E],
            [bx.x1 - h, ym, E + rise],
          ],
          "#653a2e",
        );
      } else {
        F(
          [
            [bx.x0, bx.y0, E],
            [bx.x0, bx.y1, E],
            [bx.x0, ym, E + rise],
          ],
          cDark,
        );
        F(
          [
            [bx.x1, bx.y0, E],
            [bx.x1, bx.y1, E],
            [bx.x1, ym, E + rise],
          ],
          cDark,
        );
      }
    } else {
      const xm = (bx.x0 + bx.x1) / 2,
        h = hip ? Math.min((bx.x1 - bx.x0) / 2, (bx.y1 - bx.y0) / 2) : 0;
      F(
        [
          [X0, Y0, E],
          [X0, Y1, E],
          [xm, hip ? bx.y1 - h : Y1, E + rise],
          [xm, hip ? bx.y0 + h : Y0, E + rise],
        ],
        "#7c4a3a",
      );
      F(
        [
          [X1, Y0, E],
          [X1, Y1, E],
          [xm, hip ? bx.y1 - h : Y1, E + rise],
          [xm, hip ? bx.y0 + h : Y0, E + rise],
        ],
        "#6e4033",
      );
      if (hip) {
        F(
          [
            [X0, Y0, E],
            [X1, Y0, E],
            [xm, bx.y0 + h, E + rise],
          ],
          "#653a2e",
        );
        F(
          [
            [X0, Y1, E],
            [X1, Y1, E],
            [xm, bx.y1 - h, E + rise],
          ],
          "#653a2e",
        );
      } else {
        F(
          [
            [bx.x0, bx.y0, E],
            [bx.x1, bx.y0, E],
            [xm, bx.y0, E + rise],
          ],
          cDark,
        );
        F(
          [
            [bx.x0, bx.y1, E],
            [bx.x1, bx.y1, E],
            [xm, bx.y1, E + rise],
          ],
          cDark,
        );
      }
    }
  }
  /* the size on screen */
  const sp = all
    .flatMap((q) => q.c.flatMap((p) => [iso2(p, q.z0), iso2(p, q.z0 + q.H)]))
    .concat(faces.flatMap((f) => f.pts.map((p) => iso2(rot(p), p[2]))));
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
  /* the ground shadow */
  B.storeys[0].W.forEach((w) => {
    const q = all.find((a) => a.w === w);
    if (q)
      poly(
        q.c.map((p) => S(p, 0)),
        "#e2e6ea",
      );
  });
  /* back to front, lower storeys first */
  all.sort((p, q) => p.z0 - q.z0 || p.depth - q.depth);
  all.forEach((q) => {
    const sides = [
      [q.c[0], q.c[1]],
      [q.c[1], q.c[2]],
      [q.c[2], q.c[3]],
      [q.c[3], q.c[0]],
    ];
    sides.forEach(([p, r]) => {
      const mx = (p[0] + r[0]) / 2,
        my = (p[1] + r[1]) / 2;
      const cxm = (q.c[0][0] + q.c[2][0]) / 2,
        cym = (q.c[0][1] + q.c[2][1]) / 2;
      const nx = mx - cxm,
        ny = my - cym;
      if (nx + ny <= 0) return;
      poly(
        [S(p, q.z0), S(r, q.z0), S(r, q.z0 + q.H), S(p, q.z0 + q.H)],
        nx > ny ? cLight : cDark,
        cLine,
      );
      const along = Math.abs((r[0] - p[0]) * q.u[0] + (r[1] - p[1]) * q.u[1]) > q.w.T;
      if (!along) return;
      const sgn = (r[0] - p[0]) * q.u[0] + (r[1] - p[1]) * q.u[1] > 0 ? 1 : -1;
      const base = sgn > 0 ? p : r;
      const pt = (t) => [base[0] + q.u[0] * t, base[1] + q.u[1] * t];
      q.w.cuts.forEach((ct) => {
        const a1 = pt(ct.t1),
          a2 = pt(ct.t2);
        poly(
          [
            S(a1, q.z0 + ct.sill),
            S(a2, q.z0 + ct.sill),
            S(a2, q.z0 + ct.sill + ct.h),
            S(a1, q.z0 + ct.sill + ct.h),
          ],
          ct.win ? "#9cc3e6" : "#6b5440",
          "#3b2f22",
        );
      });
    });
    poly(
      q.c.map((p) => S(p, q.z0 + q.H)),
      "#eadfcd",
      cLine,
    );
  });
  /* the roof last: only the faces turned towards the viewer (above, from the +x +y side), furthest first */
  const zc = E + rise / 3;
  faces
    .map((f) => {
      const rp = f.pts.map((p) => rot(p));
      const q = rp.map((p, i) => [p[0], p[1], f.pts[i][2]]);
      const a = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]],
        b = [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]];
      let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const m = q.reduce(
        (s, p) => [s[0] + p[0] / q.length, s[1] + p[1] / q.length, s[2] + p[2] / q.length],
        [0, 0, 0],
      );
      /* point the normal out of the building */
      if (n[0] * m[0] + n[1] * m[1] + n[2] * (m[2] - zc) < 0) n = [-n[0], -n[1], -n[2]];
      const vis = n[0] + n[1] + n[2] * 1.4 > 0;
      return { f, rp, vis, depth: m[0] + m[1] + m[2] / 1000 };
    })
    .filter((o) => o.vis)
    .sort((a, b) => a.depth - b.depth)
    .forEach(({ f, rp }) =>
      poly(
        rp.map((p, i) => S(p, f.pts[i][2])),
        f.fill,
        "#3b2620",
      ),
    );
}
function hs3View(B) {
  if (!B) return;
  /* a pop-up over the drawing (the drawing screen sits above the app's own viewer) */
  const d = document.createElement("div");
  d.className = "dimask";
  d.innerHTML = `<div class="dimbox hs3" role="dialog" aria-label="3D view"><b>🧊 3D view from the plan</b><div class="who">${B.storeys.length} storey${B.storeys.length === 1 ? "" : "s"}, walls ${B.H} mm a storey, with the doors and windows from the plan and the roof from 🏘️.</div>
    <canvas id="hs3-cv" width="1000" height="700" class="hs3-cv" aria-label="3D view of the building"></canvas>
    <div class="dimbtns"><button type="button" class="btn" id="hs3-l">↺ Turn</button><button type="button" class="btn" id="hs3-r">↻ Turn</button><button type="button" class="btn" id="hs3-save">⬇ Save the picture</button><button type="button" class="btn primary" id="hs3-x">Close</button></div></div>`;
  document.body.appendChild(d);
  $("hs3-x").onclick = () => d.remove();
  const draw = () => hs3Draw($("hs3-cv"), B, HS3.ang);
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
