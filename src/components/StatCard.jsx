export function StatCard({ label, value, hint, accent = "default" }) {
  return (
    <section className={`stat-card stat-card--${accent}`}>
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
      <span className="stat-card__hint">{hint}</span>
    </section>
  );
}
