import "./index.css";
import { getDemoRoutes } from "./demo-routes";

/**
 * Builds the static hub layout with correct `base`-aware links.
 *
 * @param root - Mount node (`#root`)
 */
function renderHub(root: HTMLElement) {
  const r = getDemoRoutes();
  root.replaceChildren();

  const main = document.createElement("main");
  main.className = "mx-auto max-w-xl space-y-8 px-4 py-10";

  const nav = document.createElement("nav");
  nav.className = "flex flex-wrap gap-x-4 gap-y-2";
  nav.setAttribute("aria-label", "演示页面");
  const navSpec: { label: string; href: string; current?: boolean }[] = [
    { label: "首页", href: r.home, current: true },
    { label: "React", href: r.react },
    { label: "Vue", href: r.vue },
    { label: "Web Component", href: r.webComponent },
  ];
  for (const item of navSpec) {
    const a = document.createElement("a");
    a.href = item.href;
    a.textContent = item.label;
    a.className = item.current
      ? "text-sm font-medium text-foreground"
      : "text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline";
    nav.appendChild(a);
  }
  main.appendChild(nav);

  const title = document.createElement("h1");
  title.className = "text-2xl font-semibold tracking-tight";
  title.textContent = "pinyin-ime";
  main.appendChild(title);

  const intro = document.createElement("p");
  intro.className = "text-sm text-muted-foreground";
  intro.textContent =
    "在无法使用系统输入法的场景下，用字母键输入拼音并选词上屏。以下为三种接入方式的独立演示页（部署在 GitHub Pages 子路径下）。";
  main.appendChild(intro);

  const ul = document.createElement("ul");
  ul.className = "list-inside list-disc space-y-2 text-sm text-muted-foreground";
  const pages: { href: string; title: string; desc: string }[] = [
    { href: r.react, title: "React", desc: "PinyinInput / PinyinTextarea" },
    { href: r.vue, title: "Vue 3", desc: "模板中使用 pinyin-ime-editor" },
    { href: r.webComponent, title: "Web Component", desc: "原生 DOM 挂载 pinyin-ime-editor" },
  ];
  for (const p of pages) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = p.href;
    a.className = "font-medium text-foreground underline-offset-4 hover:underline";
    a.textContent = p.title;
    li.appendChild(a);
    li.appendChild(document.createTextNode(` — ${p.desc}`));
    ul.appendChild(li);
  }
  main.appendChild(ul);

  root.appendChild(main);
}

/**
 * Client entry for the site root (`/` under Vite `base`).
 */
function main() {
  const el = document.getElementById("root");
  if (!el) return;
  renderHub(el);
}

main();
