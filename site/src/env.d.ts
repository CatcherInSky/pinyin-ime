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
          "editor-type"?: "input" | "textarea";
          "page-size"?: number;
          /** 与组件内 `parseEnabledFromAttribute` 一致：也可用字符串如 `"false"` */
          enabled?: boolean | string;
          "popup-position"?: "top" | "bottom" | "left" | "right";
        },
        HTMLElement
      >;
    }
  }
}

export {};
