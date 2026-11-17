/* ================= WINDOW PLAN: a window in a wall drawn so it stands out on a plan ================= */
export { npWindowPlan, npWindowSwing };
/* James (Nov 2026): "windows in drawing you can't see them when they are on the drawing – see what other companies do
   and make it better". Drafting practice (a window fills the full depth of its wall, glass shown through the middle)
   plus what the plan apps do to make windows easy to spot (a light blue glass tint): the wall is cut white; bold jambs
   at both ends right across the wall; the outer and inner frame faces; two glass lines through the middle with a pale
   blue tint between them; and, when the window knows which side of the wall is outside (o.os, set when it is put in a
   wall), a sill standing out from the outside face. The box is o.a–o.b, its long side along the wall. */
function npWindowPlan(ctx, o, x0, y0, w, h) {
  const v = w >= h,
    L = v ? w : h,
    D = v ? h : w,
    lw = ctx.lineWidth;
  /* a point so far along the window (s) and so far across the wall (t) */
  const P = (s, t) => (v ? [x0 + s, y0 + t] : [x0 + t, y0 + s]);
  const seg = (a, b) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  ctx.save();
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x0, y0, w, h);
  /* the glass: two lines through the middle with a pale blue tint between */
  const g1 = D * 0.38,
    g2 = D * 0.62;
  {
    const a = P(0, g1),
      b = P(L, g2);
    ctx.fillStyle = "rgba(56,152,236,0.32)";
    ctx.fillRect(
      Math.min(a[0], b[0]),
      Math.min(a[1], b[1]),
      Math.abs(b[0] - a[0]),
      Math.abs(b[1] - a[1]),
    );
  }
  ctx.lineWidth = Math.max(lw * 0.6, 0.6);
  seg(P(0, g1), P(L, g1));
  seg(P(0, g2), P(L, g2));
  /* the frame's outer and inner faces */
  ctx.lineWidth = Math.max(lw * 0.5, 0.5);
  seg(P(0, 0), P(L, 0));
  seg(P(0, D), P(L, D));
  /* the jambs: bold, right across the wall */
  ctx.lineWidth = lw * 1.4;
  seg(P(0, 0), P(0, D));
  seg(P(L, 0), P(L, D));
  /* the sill, standing out from the outside face */
  if (o.os) {
    const so = Math.max(D * 0.18, lw * 2),
      ex = Math.min(L * 0.04, D * 0.3),
      f = o.os > 0 ? D : 0,
      t = o.os > 0 ? D + so : -so;
    ctx.lineWidth = Math.max(lw * 0.7, 0.6);
    ctx.beginPath();
    const a = P(-ex, f),
      b = P(-ex, t),
      c = P(L + ex, t),
      d = P(L + ex, f);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(d[0], d[1]);
    ctx.stroke();
  }
  ctx.restore();
  if (v && o.wo) npWindowSwing(ctx, o.wo, o.os, x0, x0 + w, y0, y0 + h, lw);
}
/* how it opens (o.wo: sl / sr side hung, hinge left / right, th top hung, tt tilt & turn; none = fixed), drawn dashed
   in the window's own terms: along it t1–t2, across the wall lo–hi, os the side outside (+1 = the hi side) */
function npWindowSwing(ctx, wo, os, t1, t2, lo, hi, lw) {
  if (!wo || !os) return;
  const L = t2 - t1,
    D = hi - lo;
  const inward = wo === "tt";
  const f = os > 0 !== inward ? hi : lo,
    d = os > 0 !== inward ? 1 : -1;
  ctx.save();
  ctx.setLineDash([lw * 2.5, lw * 2]);
  ctx.lineWidth = Math.max(lw * 0.6, 0.5);
  if (wo === "th") {
    /* top hung: the sash pushed out, seen from above */
    const h = Math.min(D * 0.9, L * 0.35);
    ctx.beginPath();
    ctx.moveTo(t1, f);
    ctx.lineTo(t1, f + d * h);
    ctx.lineTo(t2, f + d * h);
    ctx.lineTo(t2, f);
    ctx.stroke();
  } else {
    /* side hung (or tilt & turn): the sash swung open on its hinge, with its arc */
    const left = wo !== "sr",
      th = left ? t1 : t2,
      sg = left ? 1 : -1,
      R = Math.min(L, Math.max(D * 2.5, L * 0.5));
    const a0 = Math.atan2(0, sg),
      a1 = Math.atan2(d, 0);
    ctx.beginPath();
    ctx.moveTo(th, f);
    ctx.lineTo(th, f + d * R);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(th, f, R, a0, a1, sg * d < 0);
    ctx.stroke();
  }
  ctx.restore();
}
