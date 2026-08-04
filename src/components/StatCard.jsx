import { Card, Statistic } from "antd";

// 各 accent 的文字颜色。antd v6 运行时样式会覆盖样式表选择器，
// 因此关键颜色全部用内联样式保证生效；主色卡用浅暖底 + 深色文字满足对比度。
const ACCENTS = {
  danger: { value: "#ff4d4f" },
  warning: { value: "#faad14" },
  success: { value: "#52c41a" },
  primary: {
    title: "#5c4f45",
    value: "#c84f1f",
    hint: "#6f6258",
    cardBg: "linear-gradient(135deg, #fff4e8 0%, #ffe6d1 100%)",
    cardBorder: "#f2d3b9",
  },
};

export function StatCard({ label, value, hint, accent = "default" }) {
  const palette = ACCENTS[accent] ?? {};

  return (
    <Card
      size="small"
      className={`stat-card stat-card--${accent}`}
      style={palette.cardBg ? { background: palette.cardBg, borderColor: palette.cardBorder } : undefined}
    >
      <Statistic
        title={palette.title ? <span style={{ color: palette.title }}>{label}</span> : label}
        value={value}
        styles={palette.value ? { content: { color: palette.value } } : undefined}
      />
      {hint ? (
        <div className="stat-card__hint" style={{ fontSize: 12, color: palette.hint ?? "#8c8c8c", marginTop: 4 }}>
          {hint}
        </div>
      ) : null}
    </Card>
  );
}
