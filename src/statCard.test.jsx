// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./components/StatCard.jsx";

function relativeLuminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((channel) => Number.parseInt(channel, 16) / 255);
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

// 回归保护：主色指标卡必须保持浅暖底 + 深色文字（WCAG AA 对比度）
describe("StatCard accent 可读性", () => {
  it("primary：浅暖底、深色标题、品牌橙数值、暖灰提示", () => {
    render(<StatCard label="本月预计实发总额" value="¥1,000" hint="已确认实发 ¥800" accent="primary" />);

    const card = screen.getByText("本月预计实发总额").closest(".ant-card");
    expect(card.style.background).toContain("linear-gradient");
    // jsdom 会把十六进制规范化为 rgb
    expect(card.style.background).toContain("255, 244, 232");

    expect(screen.getByText("本月预计实发总额")).toHaveStyle({ color: "#5c4f45" });
    expect(screen.getByText("¥1,000")).toHaveStyle({ color: "#c84f1f" });
    expect(screen.getByText("已确认实发 ¥800")).toHaveStyle({ color: "#6f6258" });

    // 渐变两端都必须达标：普通文字 4.5:1，大号数值 3:1。
    for (const background of ["#fff4e8", "#ffe6d1"]) {
      expect(contrastRatio("#5c4f45", background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio("#c84f1f", background)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio("#6f6258", background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("danger / warning / success：数值使用语义色", () => {
    const { unmount } = render(<StatCard label="月结阻塞项" value="3 项" accent="danger" />);
    expect(screen.getByText("3 项")).toHaveStyle({ color: "#ff4d4f" });
    unmount();

    const warning = render(<StatCard label="待确认员工" value="2 人" accent="warning" />);
    expect(screen.getByText("2 人")).toHaveStyle({ color: "#faad14" });
    warning.unmount();

    render(<StatCard label="已确认员工" value="8 人" accent="success" />);
    expect(screen.getByText("8 人")).toHaveStyle({ color: "#52c41a" });
  });

  it("default：不设内联数值色，提示为默认灰", () => {
    render(<StatCard label="已确认实发" value="¥2,000" hint="1 人待确认" />);
    expect(screen.getByText("¥2,000")).not.toHaveAttribute("style");
    expect(screen.getByText("1 人待确认")).toHaveStyle({ color: "#8c8c8c" });
  });
});
