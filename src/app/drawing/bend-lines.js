/* ================= BEND LINES: where a curved line bows out to ================= */
export { npBendApex, npBendCp };
/* curved lines: bend = how far the middle bows out, as a share of the length */
function npBendCp(o) {
  const mx = (o.a[0] + o.b[0]) / 2,
    my = (o.a[1] + o.b[1]) / 2,
    dx = o.b[0] - o.a[0],
    dy = o.b[1] - o.a[1],
    L = Math.hypot(dx, dy) || 1;
  return [mx - (dy / L) * o.bend * L, my + (dx / L) * o.bend * L];
}
function npBendApex(o) {
  const cp = npBendCp(o),
    mx = (o.a[0] + o.b[0]) / 2,
    my = (o.a[1] + o.b[1]) / 2;
  return [(mx + cp[0]) / 2, (my + cp[1]) / 2];
}
