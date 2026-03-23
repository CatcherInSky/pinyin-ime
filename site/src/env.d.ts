/// <reference types="vite/client" />

import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "pinyin-ime-editor": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          value?: string;
          variant?: "input" | "textarea";
        },
        HTMLElement
      >;
    }
  }
}

export {};
