/* ================= HOUSE RENDER: the building from a plan, drawn properly in 3D – light and shadow, brick and tiles, glass, a garden – to turn round and film ================= */
import { $, toast } from "../core/helpers.js";
import { S } from "../core/state.js";
import { coData } from "../owner/company-details.js";
export { hrView };
/* From 🏘️ on a drawing. Uses three.js (a 3D engine, loaded when first needed) to build the walls from the plan with
   real holes for the doors and windows, uPVC frames, glass that reflects the sky, stone sills, the storeys, and the
   roof chosen in 🏘️ (gable, hipped, lean-to or flat) with tiles or slates, fascias, soffits and ridge tiles. The
   building stands on grass with a patio round it under a sky with the sun casting soft shadows. Drag to turn it,
   pinch or scroll to zoom. 🎬 Make a video: the camera goes slowly round and up over the building with the company's
   name, the job and the spec on screen, saved as a video file to send to a customer. Textures are drawn by the app
   (no photos of anyone's products). Nothing is saved on the drawing. */
let hrThreeP = null;
function hrLoad() {
  if (window.THREE) return Promise.resolve();
  if (hrThreeP) return hrThreeP;
  hrThreeP = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = res;
    s.onerror = () => {
      hrThreeP = null;
      rej(new Error("load"));
    };
    document.head.appendChild(s);
  });
  return hrThreeP;
}
/* ---------- textures drawn on a canvas ---------- */
function hrNoise(x, w, h, amt) {
  const d = x.getImageData(0, 0, w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    d.data[i] += n;
    d.data[i + 1] += n;
    d.data[i + 2] += n;
  }
  x.putImageData(d, 0, 0);
}
function hrTex(draw, w, h, mPerTile) {
  const T = window.THREE;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 8;
  t.encoding = T.sRGBEncoding;
  t.userData = { m: mPerTile };
  return t;
}
/* brick: 215 × 65 with 10 mortar joints, stretcher bond, each brick a little different */
function hrBrick(col) {
  return hrTex(
    (x, w, h) => {
      x.fillStyle = "#cfc6b8";
      x.fillRect(0, 0, w, h);
      const bw = w / 4,
        bh = h / 12;
      for (let r = 0; r < 12; r++)
        for (let k = -1; k < 5; k++) {
          const off = r % 2 ? bw / 2 : 0;
          const v = (Math.random() - 0.5) * 30;
          const [R, G, B] = col.map((c) =>
            Math.max(0, Math.min(255, c + v + (Math.random() - 0.5) * 12)),
          );
          x.fillStyle = `rgb(${R},${G},${B})`;
          x.fillRect(k * bw + off + 3, r * bh + 3, bw - 6, bh - 6);
        }
      hrNoise(x, w, h, 18);
    },
    512,
    512,
    0.9 /* 4 bricks across = 900 mm, 12 courses = 900 mm */,
  );
}
function hrRender(col) {
  return hrTex(
    (x, w, h) => {
      x.fillStyle = col;
      x.fillRect(0, 0, w, h);
      hrNoise(x, w, h, 14);
    },
    256,
    256,
    1.5,
  );
}
function hrClad(col) {
  return hrTex(
    (x, w, h) => {
      for (let r = 0; r < 8; r++) {
        const v = (Math.random() - 0.5) * 16;
        x.fillStyle = `rgb(${col[0] + v},${col[1] + v},${col[2] + v})`;
        x.fillRect(0, (r * h) / 8, w, h / 8);
        x.fillStyle = "rgba(0,0,0,.25)";
        x.fillRect(0, ((r + 1) * h) / 8 - 3, w, 3);
      }
      hrNoise(x, w, h, 10);
    },
    256,
    256,
    1.2,
  );
}
/* roof tiles or slates: rows that overlap, each a little different */
function hrTiles(kind) {
  const base = {
    slate: [70, 74, 82],
    red: [150, 70, 50],
    brown: [105, 70, 52],
    flat: [80, 84, 88],
  }[kind] || [70, 74, 82];
  return hrTex(
    (x, w, h) => {
      x.fillStyle = "#222";
      x.fillRect(0, 0, w, h);
      const rows = kind === "flat" ? 1 : 10,
        cols = kind === "slate" ? 4 : 6;
      for (let r = 0; r < rows; r++)
        for (let k = -1; k <= cols; k++) {
          const off = r % 2 ? w / cols / 2 : 0;
          const v = (Math.random() - 0.5) * 26;
          x.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`;
          if (kind === "flat") x.fillRect(0, 0, w, h);
          else if (kind === "slate")
            x.fillRect((k * w) / cols + off + 1, (r * h) / rows + 1, w / cols - 2, h / rows - 1);
          else {
            /* clay tiles: rounded bottoms */
            const x0 = (k * w) / cols + off,
              y0 = (r * h) / rows,
              tw = w / cols,
              th = h / rows;
            x.beginPath();
            x.moveTo(x0 + 1, y0);
            x.lineTo(x0 + tw - 1, y0);
            x.lineTo(x0 + tw - 1, y0 + th * 0.8);
            x.quadraticCurveTo(x0 + tw / 2, y0 + th * 1.15, x0 + 1, y0 + th * 0.8);
            x.closePath();
            x.fill();
          }
          if (kind !== "flat") {
            x.fillStyle = "rgba(0,0,0,.35)";
            x.fillRect((k * w) / cols + off, ((r + 1) * h) / rows - 3, w / cols, 3);
          }
        }
      hrNoise(x, w, h, 14);
    },
    512,
    512,
    kind === "flat" ? 2 : 1.6,
  );
}
function hrGrass() {
  return hrTex(
    (x, w, h) => {
      x.fillStyle = "#5f8a3a";
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const g = 90 + Math.random() * 70;
        x.fillStyle = `rgba(${40 + Math.random() * 40},${g},${30 + Math.random() * 25},.6)`;
        x.fillRect(Math.random() * w, Math.random() * h, 1.5, 3);
      }
    },
    512,
    512,
    3,
  );
}
function hrPaving() {
  return hrTex(
    (x, w, h) => {
      x.fillStyle = "#8d877d";
      x.fillRect(0, 0, w, h);
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 4; k++) {
          const v = (Math.random() - 0.5) * 22;
          x.fillStyle = `rgb(${196 + v},${188 + v},${172 + v})`;
          x.fillRect((k * w) / 4 + 2, (r * h) / 4 + 2, w / 4 - 4, h / 4 - 4);
        }
      hrNoise(x, w, h, 12);
    },
    256,
    256,
    1.8,
  );
}
/* a material whose texture repeats by real size (the geometry's UVs are in metres) */
function hrMat(tex, opts) {
  const T = window.THREE;
  const t = tex.clone();
  t.needsUpdate = true;
  t.repeat.set(1 / tex.userData.m, 1 / tex.userData.m);
  return new T.MeshStandardMaterial(
    Object.assign({ map: t, roughness: 0.9, metalness: 0 }, opts || {}),
  );
}
/* ---------- the building ---------- */
const HR_FIN = {
  brick: () => hrBrick([170, 92, 64]),
  render: () => hrRender("#efe9dd"),
  clad: () => hrClad([150, 160, 140]),
  none: () => hrRender("#d8cfc0"),
};
function hrBuild(B) {
  const T = window.THREE;
  const st = B.st || {};
  const mm = (v) => v / 1000;
  const g = new T.Group();
  const wallTex = (HR_FIN[st.finish] || HR_FIN.brick)();
  const wallMat = hrMat(wallTex);
  const frameCol = st.frames === "anthracite" ? 0x30343a : 0xf4f4f2;
  const frameMat = new T.MeshStandardMaterial({
    color: frameCol,
    roughness: 0.45,
    metalness: 0.05,
  });
  const glassMat = new T.MeshStandardMaterial({
    color: 0x86a9bf,
    roughness: 0.05,
    metalness: 0.6,
    transparent: true,
    opacity: 0.75,
    envMapIntensity: 1.2,
  });
  const doorMat = new T.MeshStandardMaterial({
    color: st.doorCol === "oak" ? 0x8a5a33 : st.doorCol === "red" ? 0x7a1f1f : 0x2f3640,
    roughness: 0.5,
    envMapIntensity: 0.25,
  });
  const sillMat = new T.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.8 });
  const box = (w, h, d, m, x, y, z, parent) => {
    const me = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    me.position.set(x, y, z);
    me.castShadow = me.receiveShadow = true;
    (parent || g).add(me);
    return me;
  };
  B.storeys.forEach((s) =>
    s.W.forEach((w) => {
      const L = mm(w.L),
        H = mm(s.h || w.H),
        D = mm(w.T);
      /* the wall with real holes for the openings */
      const sh = new T.Shape();
      sh.moveTo(0, 0);
      sh.lineTo(L, 0);
      sh.lineTo(L, H);
      sh.lineTo(0, H);
      sh.lineTo(0, 0);
      w.cuts.forEach((k) => {
        const p = new T.Path();
        const a = mm(k.t1),
          b = mm(k.t2),
          y0 = mm(k.sill),
          y1 = Math.min(H - 0.02, mm(k.sill + k.h));
        p.moveTo(a, y0);
        p.lineTo(a, y1);
        p.lineTo(b, y1);
        p.lineTo(b, y0);
        p.lineTo(a, y0);
        sh.holes.push(p);
      });
      const geo = new T.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false });
      geo.translate(0, 0, -D / 2);
      const grp = new T.Group();
      const me = new T.Mesh(geo, wallMat);
      me.castShadow = me.receiveShadow = true;
      grp.add(me);
      const ang = Math.atan2(w.u[1], w.u[0]);
      grp.rotation.y = -ang;
      grp.position.set(mm(w.a[0]), mm(s.z), mm(w.a[1]));
      /* which side of the wall is outside (local +z or −z) */
      const nl = [-Math.sin(ang), Math.cos(ang)];
      const outS = nl[0] * w.n[0] + nl[1] * w.n[1] > 0 ? 1 : -1;
      const zf = outS * (D / 2 - 0.06); /* frames set 60 mm back from the face */
      w.cuts.forEach((k) => {
        const a = mm(k.t1),
          b = mm(k.t2),
          y0 = mm(k.sill),
          y1 = Math.min(H - 0.02, mm(k.sill + k.h));
        const cx = (a + b) / 2,
          cy = (y0 + y1) / 2,
          ww = b - a,
          hh = y1 - y0,
          f = 0.065;
        /* the frame */
        box(ww, f, 0.07, frameMat, cx, y1 - f / 2, zf, grp);
        box(ww, f, 0.07, frameMat, cx, y0 + f / 2, zf, grp);
        box(f, hh, 0.07, frameMat, a + f / 2, cy, zf, grp);
        box(f, hh, 0.07, frameMat, b - f / 2, cy, zf, grp);
        if (k.win) {
          const gl = new T.Mesh(new T.PlaneGeometry(ww - 2 * f, hh - 2 * f), glassMat);
          gl.position.set(cx, cy, zf);
          if (outS < 0) gl.rotation.y = Math.PI;
          grp.add(gl);
          if (st.win === "sash") box(ww, 0.05, 0.08, frameMat, cx, cy, zf + outS * 0.01, grp);
          else if (st.win !== "fixed" && ww > 0.7)
            box(0.06, hh, 0.08, frameMat, cx, cy, zf + outS * 0.01, grp);
          /* a stone sill */
          if (k.sill > 0)
            box(ww + 0.12, 0.06, 0.16, sillMat, cx, y0 - 0.03, outS * (D / 2 + 0.02), grp);
        } else if (ww >= 1.1) {
          /* French or bi-fold: glazed leaves */
          const n = ww >= 1.5 ? Math.max(2, Math.round(ww / 0.75)) : 2;
          for (let i = 0; i < n; i++) {
            const lw = (ww - 2 * f) / n,
              lx = a + f + lw * (i + 0.5);
            const gl = new T.Mesh(new T.PlaneGeometry(lw - 0.1, hh - 2 * f - 0.15), glassMat);
            gl.position.set(lx, cy + 0.04, zf);
            if (outS < 0) gl.rotation.y = Math.PI;
            grp.add(gl);
            if (i) box(0.07, hh, 0.08, frameMat, a + f + lw * i, cy, zf, grp);
          }
        } else {
          /* a front door with a small glass panel and a handle */
          box(ww - 2 * f, hh - f, 0.05, doorMat, cx, cy - f / 2, zf, grp);
          const gl = new T.Mesh(new T.PlaneGeometry((ww - 2 * f) * 0.35, hh * 0.3), glassMat);
          gl.position.set(cx, cy + hh * 0.22, zf + outS * 0.03);
          if (outS < 0) gl.rotation.y = Math.PI;
          grp.add(gl);
          box(
            0.03,
            0.18,
            0.04,
            new T.MeshStandardMaterial({ color: 0xc9c9c9, metalness: 0.9, roughness: 0.25 }),
            b - f - 0.1,
            cy - 0.05,
            zf + outS * 0.05,
            grp,
          );
        }
      });
      g.add(grp);
    }),
  );
  /* the roof */
  const R = B.roof || { type: "none" };
  const bx = B.box;
  const E = B.E,
    o = R.over || 0,
    rise = R.rise || 0;
  const cover = st.cover || (R.type === "flat" ? "flat" : "slate");
  const roofTex = hrTiles(R.type === "flat" ? "flat" : cover);
  const fasciaMat = new T.MeshStandardMaterial({
    color: st.frames === "anthracite" ? 0x30343a : 0xf2f2f0,
    roughness: 0.5,
  });
  const plane = (pts, mat) => {
    /* a flat face, its texture laid along its first edge (the eaves) */
    const P = pts.map((p) => new T.Vector3(mm(p[0]), mm(p[2]), mm(p[1])));
    const ax = P[1].clone().sub(P[0]).normalize();
    const nrm = P[1]
      .clone()
      .sub(P[0])
      .cross(P[P.length - 1].clone().sub(P[0]))
      .normalize();
    const up = nrm.clone().cross(ax).normalize();
    const pos = [],
      uv = [];
    const tri = (i, j, k) =>
      [i, j, k].forEach((q) => {
        pos.push(P[q].x, P[q].y, P[q].z);
        const d = P[q].clone().sub(P[0]);
        uv.push(d.dot(ax), d.dot(up));
      });
    tri(0, 1, 2);
    if (P.length === 4) tri(0, 2, 3);
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    const me = new T.Mesh(geo, mat);
    me.material.side = T.DoubleSide;
    me.castShadow = me.receiveShadow = true;
    g.add(me);
  };
  const rm = hrMat(roofTex, { roughness: 0.75 });
  const X0 = bx.x0 - o,
    X1 = bx.x1 + o,
    Y0 = bx.y0 - o,
    Y1 = bx.y1 + o;
  const eave = (p, q) => {
    /* a fascia board along an eave, 200 deep */
    const a = new T.Vector3(mm(p[0]), mm(E) - 0.1, mm(p[1])),
      b = new T.Vector3(mm(q[0]), mm(E) - 0.1, mm(q[1]));
    const len = a.distanceTo(b);
    const me = new T.Mesh(new T.BoxGeometry(len, 0.2, 0.025), fasciaMat);
    me.position.copy(a.clone().add(b).multiplyScalar(0.5));
    me.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    me.castShadow = true;
    g.add(me);
    /* the soffit under the overhang */
    if (o > 50) {
      const sf = new T.Mesh(new T.BoxGeometry(len, 0.015, mm(o)), fasciaMat);
      sf.position.copy(me.position).add(new T.Vector3(0, -0.1, 0));
      sf.rotation.y = me.rotation.y;
      const n = new T.Vector3(-(b.z - a.z), 0, b.x - a.x).normalize();
      const mid = new T.Vector3(mm((bx.x0 + bx.x1) / 2), 0, mm((bx.y0 + bx.y1) / 2));
      const towards = mid.clone().sub(me.position).setY(0);
      sf.position.add(n.multiplyScalar(((n.dot(towards) > 0 ? 1 : -1) * mm(o)) / 2));
      g.add(sf);
    }
  };
  const ridge = (p, q) => {
    const a = new T.Vector3(mm(p[0]), mm(E + rise) + 0.03, mm(p[1])),
      b = new T.Vector3(mm(q[0]), mm(E + rise) + 0.03, mm(q[1]));
    const len = a.distanceTo(b);
    if (len < 0.05) return;
    const me = new T.Mesh(
      new T.CylinderGeometry(0.11, 0.11, len, 14, 1, false, 0, Math.PI),
      new T.MeshStandardMaterial({
        color: cover === "red" ? 0x7a3524 : cover === "brown" ? 0x4f3322 : 0x2e3136,
        roughness: 0.7,
        envMapIntensity: 0.3,
      }),
    );
    me.position.copy(a.clone().add(b).multiplyScalar(0.5));
    me.rotation.z = Math.PI / 2;
    me.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    me.castShadow = true;
    g.add(me);
  };
  const gableWall = (pts) => plane(pts, wallMat);
  if (R.type === "flat") {
    plane(
      [
        [bx.x0, bx.y0, E + 200],
        [bx.x1, bx.y0, E + 200],
        [bx.x1, bx.y1, E + 200],
        [bx.x0, bx.y1, E + 200],
      ],
      rm,
    );
    /* the parapet with a coping */
    [
      [
        [bx.x0, bx.y0],
        [bx.x1, bx.y0],
      ],
      [
        [bx.x1, bx.y0],
        [bx.x1, bx.y1],
      ],
      [
        [bx.x1, bx.y1],
        [bx.x0, bx.y1],
      ],
      [
        [bx.x0, bx.y1],
        [bx.x0, bx.y0],
      ],
    ].forEach(([p, q]) => {
      const a = new T.Vector3(mm(p[0]), mm(E), mm(p[1])),
        b = new T.Vector3(mm(q[0]), mm(E), mm(q[1]));
      const len = a.distanceTo(b);
      const me = new T.Mesh(
        new T.BoxGeometry(len + 0.1, 0.32, 0.12),
        new T.MeshStandardMaterial({ color: 0x9a9890, roughness: 0.8 }),
      );
      me.position.copy(a.clone().add(b).multiplyScalar(0.5)).add(new T.Vector3(0, 0.16, 0));
      me.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      me.castShadow = true;
      g.add(me);
    });
  } else if (R.type === "lean") {
    plane(
      [
        [X0, Y1, E],
        [X1, Y1, E],
        [X1, bx.y0, E + rise],
        [X0, bx.y0, E + rise],
      ],
      rm,
    );
    gableWall([
      [bx.x0, bx.y0, E],
      [bx.x1, bx.y0, E],
      [bx.x1, bx.y0, E + rise],
      [bx.x0, bx.y0, E + rise],
    ]);
    gableWall([
      [bx.x0, bx.y1, E],
      [bx.x0, bx.y0, E],
      [bx.x0, bx.y0, E + rise],
    ]);
    gableWall([
      [bx.x1, bx.y1, E],
      [bx.x1, bx.y0, E],
      [bx.x1, bx.y0, E + rise],
    ]);
    eave([X0, Y1], [X1, Y1]);
  } else if (R.type === "gable" || R.type === "hip") {
    const hip = R.type === "hip";
    if (R.ax === "x") {
      const ym = (bx.y0 + bx.y1) / 2,
        h = hip ? Math.min((bx.x1 - bx.x0) / 2, (bx.y1 - bx.y0) / 2) : 0;
      const ra = [hip ? bx.x0 + h : X0, ym],
        rb = [hip ? bx.x1 - h : X1, ym];
      plane(
        [
          [X0, Y1, E],
          [X1, Y1, E],
          [rb[0], ym, E + rise],
          [ra[0], ym, E + rise],
        ],
        rm,
      );
      plane(
        [
          [X1, Y0, E],
          [X0, Y0, E],
          [ra[0], ym, E + rise],
          [rb[0], ym, E + rise],
        ],
        rm,
      );
      if (hip) {
        plane(
          [
            [X0, Y0, E],
            [X0, Y1, E],
            [ra[0], ym, E + rise],
          ],
          rm,
        );
        plane(
          [
            [X1, Y1, E],
            [X1, Y0, E],
            [rb[0], ym, E + rise],
          ],
          rm,
        );
        eave([X0, Y0], [X0, Y1]);
        eave([X1, Y0], [X1, Y1]);
      } else {
        gableWall([
          [bx.x0, bx.y0, E],
          [bx.x0, bx.y1, E],
          [bx.x0, ym, E + rise],
        ]);
        gableWall([
          [bx.x1, bx.y1, E],
          [bx.x1, bx.y0, E],
          [bx.x1, ym, E + rise],
        ]);
      }
      eave([X0, Y1], [X1, Y1]);
      eave([X0, Y0], [X1, Y0]);
      ridge(ra, rb);
    } else {
      const xm = (bx.x0 + bx.x1) / 2,
        h = hip ? Math.min((bx.x1 - bx.x0) / 2, (bx.y1 - bx.y0) / 2) : 0;
      const ra = [xm, hip ? bx.y0 + h : Y0],
        rb = [xm, hip ? bx.y1 - h : Y1];
      plane(
        [
          [X0, Y0, E],
          [X0, Y1, E],
          [xm, rb[1], E + rise],
          [xm, ra[1], E + rise],
        ],
        rm,
      );
      plane(
        [
          [X1, Y1, E],
          [X1, Y0, E],
          [xm, ra[1], E + rise],
          [xm, rb[1], E + rise],
        ],
        rm,
      );
      if (hip) {
        plane(
          [
            [X1, Y0, E],
            [X0, Y0, E],
            [xm, ra[1], E + rise],
          ],
          rm,
        );
        plane(
          [
            [X0, Y1, E],
            [X1, Y1, E],
            [xm, rb[1], E + rise],
          ],
          rm,
        );
        eave([X0, Y0], [X1, Y0]);
        eave([X0, Y1], [X1, Y1]);
      } else {
        gableWall([
          [bx.x0, bx.y0, E],
          [bx.x1, bx.y0, E],
          [xm, bx.y0, E + rise],
        ]);
        gableWall([
          [bx.x1, bx.y1, E],
          [bx.x0, bx.y1, E],
          [xm, bx.y1, E + rise],
        ]);
      }
      eave([X0, Y0], [X0, Y1]);
      eave([X1, Y0], [X1, Y1]);
      ridge(ra, rb);
    }
  }
  /* the ground: a patio round the building and a lawn */
  const cx = mm((bx.x0 + bx.x1) / 2),
    cz = mm((bx.y0 + bx.y1) / 2),
    sx = mm(bx.x1 - bx.x0),
    sz = mm(bx.y1 - bx.y0);
  const lawn = new T.Mesh(
    new T.PlaneGeometry(400, 400),
    (() => {
      const m = hrMat(hrGrass(), { roughness: 1 });
      m.map.repeat.set(400 / 3, 400 / 3);
      return m;
    })(),
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(cx, -0.01, cz);
  lawn.receiveShadow = true;
  g.add(lawn);
  const pv = hrMat(hrPaving(), { roughness: 0.95 });
  const pat = new T.Mesh(new T.PlaneGeometry(sx + 2.4, sz + 2.4), pv);
  pv.map.repeat.set((sx + 2.4) / 1.8, (sz + 2.4) / 1.8);
  pat.rotation.x = -Math.PI / 2;
  pat.position.set(cx, 0.005, cz);
  pat.receiveShadow = true;
  g.add(pat);
  /* shrubs at the corners of the patio, and two trees further off */
  const leaf = (c) =>
    new T.MeshStandardMaterial({ color: c, roughness: 1, envMapIntensity: 0.2, flatShading: true });
  const bush = (x, z, rr, c) => {
    const me = new T.Mesh(new T.IcosahedronGeometry(rr, 2), leaf(c));
    me.position.set(x, rr * 0.7, z);
    me.scale.y = 0.8;
    me.castShadow = me.receiveShadow = true;
    g.add(me);
  };
  const hx = sx / 2 + 1.6,
    hz = sz / 2 + 1.6;
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([a, b], i) =>
    bush(cx + a * hx, cz + b * hz, 0.45 + (i % 2) * 0.15, i % 2 ? 0x3f6b2f : 0x4d7a35),
  );
  const tree = (x, z, h) => {
    const tr = new T.Mesh(
      new T.CylinderGeometry(0.12, 0.18, h * 0.45, 8),
      new T.MeshStandardMaterial({ color: 0x5a4330, roughness: 1 }),
    );
    tr.position.set(x, h * 0.22, z);
    tr.castShadow = true;
    g.add(tr);
    /* a crown of a few overlapping clumps */
    [
      [0, 0.62, 0, 0.3],
      [0.22, 0.55, 0.12, 0.22],
      [-0.2, 0.52, -0.1, 0.24],
      [0.05, 0.78, -0.05, 0.2],
    ].forEach(([dx, dy, dz, rr], i) => {
      const cr = new T.Mesh(
        new T.IcosahedronGeometry(h * rr, 2),
        new T.MeshStandardMaterial({
          color: i % 2 ? 0x2f5a24 : 0x3a6a2b,
          roughness: 1,
          envMapIntensity: 0.15,
        }),
      );
      cr.position.set(x + dx * h, h * dy, z + dz * h);
      cr.castShadow = cr.receiveShadow = true;
      g.add(cr);
    });
  };
  /* beyond where the camera goes round, so they frame it but never block the view */
  const far = (Math.max(sx, sz, mm(E + rise)) * 2.1 + 4) * 1.6;
  tree(cx - far * 0.8, cz - far * 0.6, 7);
  tree(cx + far * 0.75, cz - far * 0.7, 8.5);
  tree(cx - far * 0.9, cz + far * 0.45, 6.5);
  return {
    g,
    centre: new T.Vector3(cx, mm(E + rise) / 2, cz),
    size: Math.max(sx, sz, mm(E + rise)),
  };
}
/* ---------- the viewer ---------- */
const HR = { r: null };
function hrSky(T) {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const x = c.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#5f95cf");
  gr.addColorStop(0.55, "#a9c9e8");
  gr.addColorStop(1, "#e9f1f7");
  x.fillStyle = gr;
  x.fillRect(0, 0, 4, 256);
  const t = new T.CanvasTexture(c);
  t.encoding = T.sRGBEncoding;
  return t;
}
async function hrView(B, onDone) {
  if (!B) return;
  const d = document.createElement("div");
  d.className = "dimask";
  d.innerHTML = `<div class="dimbox hs3 hr-box" role="dialog" aria-label="3D view"><b>🧊 3D view</b><div class="who" id="hr-msg">Building the model…</div>
    <div class="hr-stage"><canvas id="hr-cv" class="hs3-cv" aria-label="3D view of the building"></canvas></div>
    <div class="who">Drag to turn it round, pinch or scroll to zoom.</div>
    <div class="dimbtns"><button type="button" class="btn" id="hr-save">⬇ Save the picture</button><button type="button" class="btn" id="hr-vid">🎬 Make a video</button><button type="button" class="btn primary" id="hr-x">Close</button></div></div>`;
  document.body.appendChild(d);
  let stop = false;
  const close = () => {
    stop = true;
    try {
      if (HR.r) HR.r.dispose();
    } catch (e) {}
    d.remove();
    if (onDone) onDone();
  };
  $("hr-x").onclick = close;
  try {
    await hrLoad();
  } catch (e) {
    $("hr-msg").textContent = "Couldn't load the 3D engine – check your connection.";
    return;
  }
  const T = window.THREE;
  const cv = $("hr-cv");
  const Wd = Math.min(1600, Math.round(cv.clientWidth * (window.devicePixelRatio || 1))) || 1200,
    Ht = Math.round(Wd * 0.62);
  const r = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
  HR.r = r;
  r.setSize(Wd, Ht, false);
  r.shadowMap.enabled = true;
  r.shadowMap.type = T.PCFSoftShadowMap;
  r.outputEncoding = T.sRGBEncoding;
  r.toneMapping = T.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.physicallyCorrectLights = true;
  const scene = new T.Scene();
  scene.background = hrSky(T);
  scene.fog = new T.Fog(0xdde9f3, 30, 160);
  const M = hrBuild(B);
  scene.add(M.g);
  /* sky light and a low afternoon sun with soft shadows */
  scene.add(new T.HemisphereLight(0xcfe3ff, 0x5d6b3a, 1.1));
  const sun = new T.DirectionalLight(0xfff1dc, 3.2);
  const s = M.size;
  sun.position.set(M.centre.x + s * 1.2, s * 1.6 + 6, M.centre.z + s * 1.5);
  sun.target.position.copy(M.centre);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = s * 1.3 + 4;
  Object.assign(sun.shadow.camera, {
    left: -sc,
    right: sc,
    top: sc,
    bottom: -sc,
    near: 0.5,
    far: s * 6 + 40,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  /* reflections in the glass: the sky */
  try {
    const pm = new T.PMREMGenerator(r);
    const envS = new T.Scene();
    envS.add(
      new T.Mesh(
        new T.SphereGeometry(50, 32, 16),
        new T.MeshBasicMaterial({ map: hrSky(T), side: T.BackSide }),
      ),
    );
    scene.environment = pm.fromScene(envS).texture;
  } catch (e) {}
  const cam = new T.PerspectiveCamera(38, Wd / Ht, 0.1, 500);
  const orb = { th: -0.75, ph: 0.32, dist: s * 2.1 + 4 };
  const place = () => {
    cam.position.set(
      M.centre.x + orb.dist * Math.cos(orb.ph) * Math.sin(orb.th),
      M.centre.y + orb.dist * Math.sin(orb.ph),
      M.centre.z + orb.dist * Math.cos(orb.ph) * Math.cos(orb.th),
    );
    cam.lookAt(M.centre);
  };
  const draw = () => {
    place();
    r.render(scene, cam);
  };
  draw();
  $("hr-msg").textContent =
    `${B.storeys.length} storey${B.storeys.length === 1 ? "" : "s"}, ${{ gable: "a gable roof", hip: "a hipped roof", lean: "a lean-to roof", flat: "a flat roof", none: "no roof" }[(B.roof || {}).type] || ""}${(B.roof || {}).type && B.roof.type !== "flat" && B.roof.type !== "none" ? ` at ${B.st.pitch}°` : ""}.`;
  /* drag to turn, pinch or scroll to zoom */
  let drag = null,
    pinch = null;
  cv.onpointerdown = (e) => {
    drag = { x: e.clientX, y: e.clientY, th: orb.th, ph: orb.ph };
    cv.setPointerCapture(e.pointerId);
  };
  cv.onpointermove = (e) => {
    if (!drag || pinch) return;
    orb.th = drag.th - (e.clientX - drag.x) * 0.008;
    orb.ph = Math.max(0.05, Math.min(1.35, drag.ph + (e.clientY - drag.y) * 0.006));
    draw();
  };
  cv.onpointerup = () => (drag = null);
  cv.onwheel = (e) => {
    e.preventDefault();
    orb.dist = Math.max(s * 0.8 + 2, Math.min(s * 5 + 20, orb.dist * (e.deltaY > 0 ? 1.08 : 0.92)));
    draw();
  };
  cv.ontouchstart = (e) => {
    if (e.touches.length === 2)
      pinch = {
        d: Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        ),
        dist: orb.dist,
      };
  };
  cv.ontouchmove = (e) => {
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    const dd = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
    orb.dist = Math.max(s * 0.8 + 2, Math.min(s * 5 + 20, (pinch.dist * pinch.d) / (dd || 1)));
    draw();
  };
  cv.ontouchend = () => (pinch = null);
  HR.view = { draw, orb, M, cam, r, scene, B, isStopped: () => stop };
  $("hr-save").onclick = async () => {
    draw();
    const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
    try {
      await S.dl.save({ filename: "3D view.png", data: blob });
    } catch (e) {
      toast("Couldn't save the picture");
    }
  };
  $("hr-vid").onclick = () => hrVideo();
}
/* ---------- the video: round and up over the building, with titles ---------- */
async function hrVideo() {
  const V = HR.view;
  if (!V) return;
  if (!window.MediaRecorder) {
    toast("This device can't record video from the app");
    return;
  }
  const co = coData();
  const st = V.B.st || {};
  const roofTxt =
    { gable: "Gable roof", hip: "Hipped roof", lean: "Lean-to roof", flat: "Flat roof", none: "" }[
      (V.B.roof || {}).type
    ] || "";
  const coverTxt =
    {
      slate: "natural slate",
      red: "red clay tiles",
      brown: "brown concrete tiles",
      flat: "single-ply membrane",
    }[st.cover || "slate"] || "";
  const lines = [
    roofTxt
      ? `${roofTxt}${(V.B.roof || {}).type !== "flat" && (V.B.roof || {}).type !== "none" ? ` at ${st.pitch}°` : ""}${coverTxt ? ", " + coverTxt : ""}`
      : "",
    `${V.B.storeys.length} storey${V.B.storeys.length === 1 ? "" : "s"} · ${{ brick: "brick", render: "render", clad: "cladding", none: "" }[st.finish] || ""}`,
  ].filter(Boolean);
  const cv = V.r.domElement;
  const out = document.createElement("canvas");
  out.width = cv.width;
  out.height = cv.height;
  const ox = out.getContext("2d");
  const mime =
    ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find(
      (t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t),
    ) || "";
  let rec;
  try {
    rec = new MediaRecorder(
      out.captureStream(30),
      mime ? { mimeType: mime, videoBitsPerSecond: 8000000 } : undefined,
    );
  } catch (e) {
    toast("This device can't record video from the app");
    return;
  }
  const chunks = [];
  rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
  const done = new Promise((res) => (rec.onstop = res));
  $("hr-msg").textContent = "Filming… (about 14 seconds)";
  $("hr-vid").disabled = true;
  rec.start(250);
  const th0 = V.orb.th,
    ph0 = V.orb.ph,
    d0 = V.orb.dist;
  const dur = 14000;
  const t0 = performance.now();
  await new Promise((res) => {
    const step = (now) => {
      if (V.isStopped()) return res();
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      V.orb.th = th0 + e * Math.PI * 2;
      V.orb.ph = ph0 + Math.sin(k * Math.PI) * 0.35;
      V.orb.dist = d0 * (1 - Math.sin(k * Math.PI) * 0.15);
      V.draw();
      ox.drawImage(cv, 0, 0);
      /* titles: the company at the start, the spec along the bottom */
      const W = out.width,
        H = out.height;
      ox.fillStyle = "rgba(0,0,0,.45)";
      ox.fillRect(0, H - H * 0.13, W, H * 0.13);
      ox.fillStyle = "#fff";
      ox.font = `600 ${Math.round(H * 0.04)}px system-ui, sans-serif`;
      ox.fillText(lines.join("  ·  "), W * 0.03, H - H * 0.05);
      const a = k < 0.2 ? 1 : k < 0.3 ? 1 - (k - 0.2) * 10 : 0;
      if (a > 0) {
        ox.fillStyle = `rgba(0,0,0,${0.5 * a})`;
        ox.fillRect(0, 0, W, H * 0.16);
        ox.fillStyle = `rgba(255,255,255,${a})`;
        ox.font = `700 ${Math.round(H * 0.055)}px system-ui, sans-serif`;
        ox.fillText(co.name, W * 0.03, H * 0.09);
        ox.font = `400 ${Math.round(H * 0.032)}px system-ui, sans-serif`;
        ox.fillText(co.website || co.phone || co.mobile || "", W * 0.03, H * 0.135);
      }
      if (k < 1) requestAnimationFrame(step);
      else res();
    };
    requestAnimationFrame(step);
  });
  rec.stop();
  await done;
  V.orb.th = th0;
  V.orb.ph = ph0;
  V.orb.dist = d0;
  if (!V.isStopped()) {
    V.draw();
    $("hr-vid").disabled = false;
  }
  const type = (mime || "video/webm").split(";")[0];
  const blob = new Blob(chunks, { type });
  try {
    await S.dl.save({
      filename: `${co.name} – 3D fly-round.${type === "video/mp4" ? "mp4" : "webm"}`,
      data: blob,
    });
    if (!V.isStopped()) $("hr-msg").textContent = "Video saved – send it to the customer.";
  } catch (e) {
    toast("Couldn't save the video");
  }
}
