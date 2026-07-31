import { Card, Statistic } from "antd";

export function StatCard({ label, value, hint, accent = "default" }) {
  const valueStyle =
    accent === "danger"
      ? { color: "#ff4d4f" }
      : accent === "warning"
      ? { color: "#faad14" }
      : accent === "success"
      ? { color: "#52c41a" }
      : undefined;

  return (
    <Card size="small" className={`stat-card stat-card--${accent}`}>
      <Statistic
        title={label}
        value={value}
        valueStyle={valueStyle}
      />
      {hint ? <div className="stat-card__hint" style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>{hint}</div> : null}
    </Card>
  );
}

