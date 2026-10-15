export default function StatCard({ icon, label, value, subtitle, color = "#8BA2FF" }) {
  return (
    <div className="card card-hover" style={{ backgroundColor: color }}>
      <div className="flex items-center gap-2 text-sm font-bold text-deep/80">
        <span className="text-xl" aria-hidden="true">{icon}</span>
        {label}
      </div>
      <p className="mt-2 font-display text-3xl font-black text-deep">{value}</p>
      {subtitle && <p className="text-sm font-semibold text-deep/70">{subtitle}</p>}
    </div>
  );
}
