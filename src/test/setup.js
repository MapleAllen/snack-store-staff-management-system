// 组件级测试公共环境：jsdom polyfill 与清理
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  // antd Grid.useBreakpoint 依赖 matchMedia，固定按桌面断点返回
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
  // Modal / Drawer 动画依赖 requestAnimationFrame
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
    window.cancelAnimationFrame = (id) => clearTimeout(id);
  }
  // antd Table / Steps / 栅格等依赖 ResizeObserver
  if (!window.ResizeObserver) {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = ResizeObserverMock;
    globalThis.ResizeObserver = ResizeObserverMock;
  }
}

afterEach(() => {
  cleanup();
  if (typeof window !== "undefined") {
    delete window.payrollDesktop;
  }
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.clear();
  }
});
