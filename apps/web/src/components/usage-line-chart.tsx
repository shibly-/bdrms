"use client";

import { useMemo, useState } from "react";

export type UsagePeriod = { key: string; label: string };
export type UsageSeries = { flatId: number; flatNo: string; values: number[] };

type Props = {
  periods: UsagePeriod[];
  series: UsageSeries[];
  unitLabel?: string;
};

const COLORS = [
  "#18181b",
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#4f46e5",
  "#0f766e",
];

function colorFor(index: number): string {
  return COLORS[index % COLORS.length];
}

export function UsageLineChart({ periods, series, unitLabel = "m³" }: Props) {
  const [hover, setHover] = useState<{
    periodIndex: number;
    seriesIndex: number;
  } | null>(null);

  const width = 840;
  const height = 280;
  const padL = 48;
  const padR = 16;
  const padT = 18;
  const padB = 36;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const maxY = useMemo(() => {
    const values = series.flatMap((s) => s.values);
    return Math.max(...values, 0.001);
  }, [series]);

  const xAt = (i: number) =>
    periods.length <= 1
      ? padL + chartW / 2
      : padL + (i / (periods.length - 1)) * chartW;
  const yAt = (v: number) => padT + chartH - (v / maxY) * chartH;

  if (periods.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No periods in the selected range.</p>
    );
  }

  const tickStep = Math.max(1, Math.ceil(periods.length / 8));

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-64 min-w-[640px] w-full"
          role="img"
          aria-label={`Consumption line chart in ${unitLabel}`}
        >
          <line
            x1={padL}
            y1={height - padB}
            x2={width - padR}
            y2={height - padB}
            stroke="#d4d4d8"
          />
          <line
            x1={padL}
            y1={padT}
            x2={padL}
            y2={height - padB}
            stroke="#d4d4d8"
          />
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = padT + chartH * (1 - frac);
            const value = maxY * frac;
            return (
              <g key={frac}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="#f4f4f5"
                />
                <text
                  x={padL - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#71717a"
                >
                  {value >= 10 ? value.toFixed(0) : value.toFixed(2)}
                </text>
              </g>
            );
          })}
          <text
            x={14}
            y={padT + chartH / 2}
            textAnchor="middle"
            fontSize="10"
            fill="#71717a"
            transform={`rotate(-90 14 ${padT + chartH / 2})`}
          >
            {unitLabel}
          </text>
          {series.map((s, si) => {
            const d = s.values
              .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`)
              .join(" ");
            return (
              <path
                key={s.flatId}
                d={d}
                fill="none"
                stroke={colorFor(si)}
                strokeWidth={2}
              />
            );
          })}
          {series.map((s, si) =>
            s.values.map((v, i) => (
              <circle
                key={`${s.flatId}-${i}`}
                cx={xAt(i)}
                cy={yAt(v)}
                r={hover?.periodIndex === i && hover.seriesIndex === si ? 5 : 3}
                fill={colorFor(si)}
                onMouseEnter={() => setHover({ periodIndex: i, seriesIndex: si })}
                onMouseLeave={() => setHover(null)}
              >
                <title>
                  {`Flat ${s.flatNo}: ${v.toFixed(3)} ${unitLabel} (${periods[i]?.label})`}
                </title>
              </circle>
            )),
          )}
          {periods.map((p, i) =>
            i % tickStep === 0 || i === periods.length - 1 ? (
              <text
                key={p.key}
                x={xAt(i)}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#52525b"
              >
                {p.label}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
        {series.map((s, si) => (
          <li key={s.flatId} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={{ backgroundColor: colorFor(si) }}
            />
            Flat {s.flatNo}
          </li>
        ))}
      </ul>
    </div>
  );
}
