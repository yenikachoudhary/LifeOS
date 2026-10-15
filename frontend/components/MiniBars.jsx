import { formatShort } from "@/lib/dates";

// data: [{ date, value }]
export default function MiniBars({ data, color = "#8BA2FF", unit = "" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-28 items-end gap-1.5" role="img" aria-label="Recent activity chart">
      {data.map((d) => (
        <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
          <div
            className="w-full rounded-full transition-all group-hover:opacity-80"
            style={{ height: `${Math.max(6, (d.value / max) * 100)}%`, backgroundColor: d.value ? color : "#EDE9FE" }}
          />
          <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-deep px-2 py-0.5 text-xs font-bold text-white group-hover:block">
            {formatShort(d.date)}: {d.value}{unit}
          </span>
        </div>
      ))}
    </div>
  );
}
