/* ================= FINGER TAP: drawing buttons answer as soon as a finger lifts ================= */
export { npFingerTap };
/* On an iPad a tap on a tool button straight after drawing can be slow to count as a click, or not count at all, so
   the tool didn't change (found checking the drawing screen on an iPad-sized touch screen, Nov 2026). The button
   answers when the finger (or Apple Pencil) lifts on it; the click that may follow is ignored, and a mouse or
   keyboard still uses the click as before. */
function npFingerTap(el, fn) {
  let at = 0;
  el.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    const r = el.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      return;
    at = Date.now();
    fn(e);
  });
  el.addEventListener("click", (e) => {
    if (Date.now() - at < 700) return;
    fn(e);
  });
}
