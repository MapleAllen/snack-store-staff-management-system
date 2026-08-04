import React from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { App } from "./App.jsx";
import { AppErrorBoundary } from "./components/AppErrorBoundary.jsx";
import "./styles.css";

export const APP_THEME = {
  token: {
    colorPrimary: "#e8622c",
    colorInfo: "#e8622c",
    colorSuccess: "#52c41a",
    colorWarning: "#faad14",
    colorError: "#ff4d4f",
    colorText: "#2e2620",
    colorBgLayout: "#faf6f1",
    borderRadius: 8,
    fontSize: 15,
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", -apple-system, sans-serif',
  },
};

// 主题与中文文案作为单一来源提升到应用入口，覆盖启动、锁屏、恢复、错误边界等全部状态。
export function AppProviders({ children }) {
  return (
    <ConfigProvider locale={zhCN} theme={APP_THEME}>
      <AppErrorBoundary>
        {children}
      </AppErrorBoundary>
    </ConfigProvider>
  );
}

export function AppRoot() {
  return (
    <AppProviders>
      <App />
    </AppProviders>
  );
}

// 测试环境（jsdom）无 #root 节点时跳过挂载，便于直接渲染 AppRoot 做组件级回归测试。
const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <AppRoot />
    </React.StrictMode>,
  );
}
