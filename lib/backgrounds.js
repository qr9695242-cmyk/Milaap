// Room backgrounds — cosmetic CSS gradients applied behind the seat grid /
// video stage. No external art assets needed (works offline, tiny payload).
// Room doc stores just the id in `background`; look it up here to render.

export const BACKGROUND_CATALOG = [
  { id: "bg_void", name: "Default", css: "#0B0B12" },
  { id: "bg_midnight", name: "Midnight", css: "linear-gradient(160deg,#0B0B12 0%,#1B1035 55%,#2C0B3F 100%)" },
  { id: "bg_sunset", name: "Sunset", css: "linear-gradient(160deg,#2C0B3F 0%,#7A1E4A 55%,#FF6F3D 100%)" },
  { id: "bg_ocean", name: "Ocean", css: "linear-gradient(160deg,#04141F 0%,#0B3D5C 55%,#0EA5A5 100%)" },
  { id: "bg_forest", name: "Forest", css: "linear-gradient(160deg,#07130D 0%,#0F3D2E 55%,#1F7A4D 100%)" },
  { id: "bg_neon", name: "Neon City", css: "linear-gradient(160deg,#0B0B12 0%,#3D0B5C 45%,#8B5CF6 75%,#FF3B7F 100%)" },
  { id: "bg_gold", name: "Royal Gold", css: "linear-gradient(160deg,#1A1206 0%,#5C3D0B 55%,#F5C34D 100%)" },
  { id: "bg_galaxy", name: "Galaxy", css: "radial-gradient(circle at 30% 20%,#3D1E5C 0%,#0B0B12 60%),radial-gradient(circle at 80% 80%,#1E3A5C 0%,transparent 50%)" },
];

export function findBackground(id) {
  return BACKGROUND_CATALOG.find((b) => b.id === id) || BACKGROUND_CATALOG[0];
}
