const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function ReferralSalesGraph({ months, desktop = false }: {
  months: { month: string; total: number }[];
  desktop?: boolean;
}) {
  const width = desktop ? 1080 : 400;
  const left = 44;
  const plotWidth = width - left - 12;
  const baseline = 148;
  const max = Math.max(100, ...months.map(({ total }) => total));
  const points = months.map(({ month, total }, index) => ({
    month,
    total,
    x: left + (index + 0.5) * plotWidth / months.length,
    y: baseline - total / max * 128,
  }));
  const line = points.map(({ x, y }) => x + "," + y).join(" ");
  const area = "M " + points[0].x + " " + baseline + " "
    + points.map(({ x, y }) => "L " + x + " " + y).join(" ")
    + " L " + points[points.length - 1].x + " " + baseline + " Z";

  return (
    <div>
      <p className="mt-1 text-sm text-[#6F655C]">Last {months.length} months · paid orders</p>
      <svg viewBox={"0 0 " + width + " 170"} className="mt-5 h-auto w-full" role="img"
        aria-label={"Referral sales over the last " + months.length + " months in dollars"}>
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line x1={left} x2={width - 12} y1={baseline - ratio * 128} y2={baseline - ratio * 128} stroke="#E6E0D8" />
            <text x="0" y={baseline + 4 - ratio * 128} fontSize="11" fill="#7F756B">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 }).format(max * ratio)}
            </text>
          </g>
        ))}
        <path d={area} fill="#F3EEE8" />
        <polyline points={line} fill="none" stroke="#A79B8E" strokeWidth="2.5"
          vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(({ month, total, x, y }) => (
          <circle key={month} cx={x} cy={y} r="4" fill="#A79B8E" stroke="white" strokeWidth="2">
            <title>{month + " · " + currency.format(total)}</title>
          </circle>
        ))}
      </svg>
      <ul className="grid gap-1 text-center" style={{
        gridTemplateColumns: "repeat(" + months.length + ", minmax(0, 1fr))",
        marginLeft: (left / width * 100) + "%",
        marginRight: (12 / width * 100) + "%",
      }}>
        {months.map(({ month, total }) => (
          <li key={month} className="min-w-0">
            <span className="block text-xs text-[#7F756B]">
              {new Date(month + "-01T00:00:00Z").toLocaleString("en-US", {
                month: "short", ...(desktop ? { year: "2-digit" as const } : {}), timeZone: "UTC",
              })}
            </span>
            <span className="mt-1 block break-words text-xs font-semibold">{currency.format(total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

