import { createApp } from "vue";
import VueWcDemo from "./VueWcDemo.vue";

/**
 * 在宿主节点挂载 Vue 演示（与 React 主应用并列）。
 *
 * @param el - 挂载点
 * @returns Vue 应用实例，便于卸载
 */
export function mountVueWcDemo(el: HTMLElement) {
  const app = createApp(VueWcDemo);
  app.mount(el);
  return app;
}
