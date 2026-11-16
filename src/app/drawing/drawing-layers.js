/* ================= DRAWING LAYERS: kinds of drawing, the layers things go on, how text looks ================= */
import { NP_LIB } from "./components.js";
export { NP_LAYERS, NP_TYPES, npFont, npLayerOf };
const NP_TYPES = [
  "Sketch",
  "Site visit notes",
  "Existing floor plan",
  "Proposed floor plan",
  "Existing and proposed plan",
  "Site / location plan",
  "Elevations",
  "Section",
  "Roof plan",
  "Foundation plan",
  "Electrical layout",
  "Plumbing and heating layout",
  "Drainage layout",
  "Kitchen layout",
  "Bathroom layout",
  "Structural / steel details",
  "Detail drawing",
  "Setting out",
  "As built",
];
const NP_LAYERS = [
  ["walls", "🧱 Walls & structure"],
  ["openings", "🚪 Doors & windows"],
  ["struct", "🪵 Timber & floors"],
  ["elec", "⚡ Electrics"],
  ["heat", "🔥 Heating & ventilation"],
  ["drain", "💧 Drainage & plumbing"],
  ["fittings", "🛁 Kitchen, bathroom & furniture"],
  ["land", "🌳 Landscaping"],
  ["elev", "🏡 Elevation & section"],
  ["rooms", "⬠ Rooms"],
  ["dims", "📏 Dimensions"],
  ["notes", "📝 Notes & text"],
  ["imports", "📥 Imported drawings & photos"],
  ["general", "✏️ Lines & sketching"],
];
let NP_KLAY = null;

/* a text box's look: o.wt weight (400 normal, 600 usual, 800 bold), o.it italic, o.al line up l / c / r */
const npFont = (o) =>
  `${o.it ? "italic " : ""}${o.wt || 600} ${o.size}px system-ui, -apple-system, sans-serif`;
function npLayerOf(o) {
  if (o.ly) return o.ly;
  if (o.t === "dim" || o.t === "ang") return "dims";
  if (o.t === "room") return "rooms";
  if (o.t === "img") return "imports";
  if (o.t === "text" || o.t === "arrow") return "notes";
  if (o.t !== "shape") return "general";
  if (!NP_KLAY) {
    NP_KLAY = {};
    const m = {
      "Walls & structure": "walls",
      "Stairs": "walls",
      "Doors & windows": "openings",
      "Kitchen & bathroom": "fittings",
      "Furniture": "fittings",
      "Electrics": "elec",
      "Heating & ventilation": "heat",
      "Drainage": "drain",
      "Drainage & water": "drain",
      "Floors": "struct",
      "Timber framing": "struct",
      "Stud wall connections": "struct",
      "Roof plan": "struct",
      "Energy": "elec",
      "Energy & wildlife": "elec",
      "Landscaping": "land",
      "Notes & details": "notes",
      "Shapes": "general",
      "Site set-up": "land",
      "Site plant & equipment": "land",
      "Fire safety": "elec",
      "Accessibility & lifts": "fittings",
      "Garden buildings": "land",
      "Foundations": "struct",
      "Bridges, poles & cables": "elec",
      "Outside lights, gates & CCTV": "elec",
      "Survey & existing site": "land",
      "Services": "elec",
      "Construction phase": "land",
      "External works": "land",
    };
    NP_LIB.forEach(([v, c, ks]) =>
      ks.forEach((k) => {
        if (!NP_KLAY[k]) NP_KLAY[k] = v === "elev" ? "elev" : m[c] || "general";
      }),
    );
  }
  return NP_KLAY[o.k] || "general";
}
