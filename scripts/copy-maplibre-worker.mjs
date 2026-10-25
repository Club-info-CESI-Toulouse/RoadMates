// MapLibre v6 loads its web worker from a URL next to its own chunk, which the Next
// bundle renames. Serve the worker (and the module it imports) under fixed names.
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const from = join("node_modules", "maplibre-gl", "dist");
const to = join("public", "maplibre");
mkdirSync(to, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(join(from, file), join(to, file));
