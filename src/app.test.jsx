// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import { theme as antdTheme } from "antd";
import { AppProviders, AppRoot } from "./main.jsx";
import { createInitialWorkspace } from "./payrollData.js";

function ThemeProbe() {
  const { token } = antdTheme.useToken();
  return <output data-testid="theme-token">{`${token.colorPrimary}|${token.colorText}|${token.colorBgLayout}`}</output>;
}

async function bootTo(pageLabel) {
  render(<AppRoot />);
  // 等待应用启动完成（工作区加载 + 页面懒加载）
  const menuItem = await waitFor(
    () => screen.getByRole("menuitem", { name: new RegExp(pageLabel) }),
    { timeout: 10000 },
  );
  fireEvent.click(menuItem);
  return menuItem;
}

describe("AppRoot 集成回归", () => {
  it("主题边界：运行时 token 使用统一暖色主题", () => {
    render(
      <AppProviders>
        <ThemeProbe />
      </AppProviders>,
    );
    expect(screen.getByTestId("theme-token")).toHaveTextContent("#e8622c|#2e2620|#faf6f1");
  });

  it("启动后渲染桌面布局", async () => {
    render(<AppRoot />);
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /工资总览/ })).toBeInTheDocument(), {
      timeout: 10000,
    });
    expect(document.querySelector(".ant-layout-sider")).toBeTruthy();
    const cta = await waitFor(() => screen.getByRole("button", { name: /下一步：/ }), { timeout: 10000 });
    expect(cta.className).toContain("ant-btn-primary");
  });

  it("员工弹窗：使用 antd 控件，不存在原生输入框", async () => {
    await bootTo("员工管理");
    const addBtn = await waitFor(() => screen.getByRole("button", { name: /新增岗位成员/ }), { timeout: 10000 });
    fireEvent.click(addBtn);

    const dialog = await waitFor(() => screen.getByRole("dialog"), { timeout: 5000 });
    expect(within(dialog).getByText("新增员工")).toBeInTheDocument();
    // 姓名/手机号/工号/岗位 4 个文本输入 + 入职日期
    expect(within(dialog).getAllByRole("textbox").length).toBeGreaterThanOrEqual(4);
    // 不允许原生 input 漏入表单（antd 控件自带 .ant-input 类）
    const nativeInputs = dialog.querySelectorAll("input:not(.ant-input)");
    expect(nativeInputs.length).toBe(0);
  });

  it("考勤：未录入的空值显示为 0 而非空白", async () => {
    await bootTo("考勤管理");
    await waitFor(() => {
      const firstNumber = document.querySelector(".ant-input-number-input");
      expect(firstNumber).toBeTruthy();
      // antd InputNumber 在 step=0.5 下会把 0 显示为 "0.0"，断言只校验非空白
      expect(firstNumber.value).toMatch(/^0/);
    }, { timeout: 10000 });
  });

  it("消息容器常驻：确认操作后 antd message 正常弹出", async () => {
    await bootTo("考勤管理");
    const confirmBtn = await waitFor(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.textContent.includes("点此确认完成") && !b.disabled);
    }, { timeout: 10000 });
    expect(confirmBtn).toBeTruthy();

    fireEvent.click(confirmBtn);
    await waitFor(() => expect(document.querySelector(".ant-message")).toBeInTheDocument(), { timeout: 5000 });
    expect(document.querySelector(".ant-message").textContent).toContain("已确认完成");
  });

  it("锁屏早退分支仍显示后台备份失败消息", async () => {
    const workspace = createInitialWorkspace();
    window.payrollDesktop = {
      loadWorkspace: vi.fn().mockResolvedValue({
        workspace,
        source: "desktop-file",
        recoveryState: "normal",
      }),
      saveWorkspace: vi.fn().mockResolvedValue({ status: "saved", savedAt: new Date().toISOString() }),
      getLockStatus: vi.fn().mockResolvedValue({ locked: true }),
      createBackup: vi.fn().mockRejectedValue(new Error("backup failed")),
      listBackups: vi.fn().mockResolvedValue([]),
      checkForUpdates: vi.fn().mockResolvedValue({ updateAvailable: false }),
    };

    render(<AppRoot />);
    await screen.findByText("请输入 PIN 解锁", {}, { timeout: 10000 });
    await waitFor(() => {
      expect(document.querySelector(".ant-message")?.textContent).toContain("自动恢复点创建失败");
    }, { timeout: 5000 });
  });
});
