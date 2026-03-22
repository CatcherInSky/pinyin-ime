import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * Mounts the demo application.
 */
function main() {
  const el = document.getElementById("root");
  if (!el) return;
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

main();
