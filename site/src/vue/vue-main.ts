import { createApp } from "vue";
import VuePage from "./VuePage.vue";
import "../common/index.css";

/**
 * Mounts the Vue-only demo page (GitHub Pages `/vue/`).
 */
function main() {
  const el = document.getElementById("root");
  if (!el) return;
  createApp(VuePage).mount(el);
}

main();
