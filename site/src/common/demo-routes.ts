/**
 * Demo site routing helpers for GitHub Pages (`base` from Vite config).
 */

/**
 * Normalizes Vite `import.meta.env.BASE_URL` to always end with `/`.
 *
 * @returns Base path such as `/pinyin-ime/`
 */
export function getDemoBaseUrl(): string {
  const b = import.meta.env.BASE_URL;
  return b.endsWith("/") ? b : `${b}/`;
}

/**
 * Returns canonical paths for each framework demo page (multi-page build).
 *
 * @returns Record of pathnames under the configured `base`
 */
export function getDemoRoutes() {
  const base = getDemoBaseUrl();
  return {
    home: base,
    react: `${base}react/`,
    vue: `${base}vue/`,
    webComponent: `${base}web_component/`,
  } as const;
}
