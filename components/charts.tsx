"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUSD } from "@/lib/finance/money";
import type { MonthPoint, SimulationResult } from "@/lib/finance/types";

const palette = ["#10243f", "#5d6b3a", "#a6843d", "#8c3a2f", "#3d6b8c", "#6b4c7a", "#2f6f6a"];

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function shortMonth(month: string): string {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1));
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function seriesRows(
  results: SimulationResult[],
  value: (point: MonthPoint, cumulativeInterest: number) => number,
  cumulative = false,
) {
  const months = [...new Set(results.flatMap((result) => result.monthly.map((point) => point.month)))].sort();
  const prepared = results.map((result) => {
    let interest = 0;
    const byMonth = new Map<string, number>();
    for (const point of result.monthly) {
      if (cumulative) interest += point.interestCharged;
      byMonth.set(point.month, value(point, interest));
    }
    return { id: result.strategyId, byMonth };
  });
  const last = new Map<string, number>();
  return months.map((month) => {
    const row: Record<string, string | number> = { month, label: shortMonth(month) };
    for (const series of prepared) {
      if (series.byMonth.has(month)) last.set(series.id, series.byMonth.get(month) ?? 0);
      row[series.id] = last.get(series.id) ?? 0;
    }
    return row;
  });
}

function ChartFrame({
  title,
  children,
  ready,
}: {
  title: string;
  children: React.ReactNode;
  ready: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 text-lg text-[#10243f]">{title}</h2>
      <div className="h-72">{ready ? children : <div className="h-full rounded-xl bg-[#f6f1e6]" />}</div>
    </section>
  );
}

function currencyTick(value: number) {
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value)}`;
}

export function StrategyLines({
  title,
  results,
  mode,
}: {
  title: string;
  results: SimulationResult[];
  mode: "balance" | "credit" | "interest" | "household";
}) {
  const ready = useMounted();
  const data = useMemo(() => {
    if (mode === "interest") return seriesRows(results, (_point, cumulative) => cumulative, true);
    if (mode === "credit") return seriesRows(results, (point) => point.availableCredit);
    if (mode === "household") return seriesRows(results, (point) => point.householdDebt);
    return seriesRows(results, (point) => point.endingPrincipal);
  }, [results, mode]);

  return (
    <ChartFrame title={title} ready={ready}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#eadfca" vertical={false} />
          <XAxis dataKey="label" minTickGap={28} tick={{ fontSize: 11, fill: "#5c6570" }} />
          <YAxis tickFormatter={currencyTick} width={52} tick={{ fontSize: 11, fill: "#5c6570" }} />
          <Tooltip formatter={(value) => formatUSD(Number(value))} />
          <Legend />
          {results.map((result, index) => (
            <Line
              key={result.strategyId}
              type="monotone"
              dataKey={result.strategyId}
              name={result.strategyName}
              stroke={palette[index % palette.length]}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function InterestBars({ results }: { results: SimulationResult[] }) {
  const ready = useMounted();
  const data = results.map((result) => ({
    name: result.strategyName.replace(" Strategy", "").replace(" Paycheck Cycling", "% cycle"),
    interest: Math.round(result.totalInterestCharged),
    fill: result.canMeetObligations ? "#5d6b3a" : "#8c3a2f",
  }));
  return (
    <ChartFrame title="HELOC interest by strategy" ready={ready}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
          <CartesianGrid stroke="#eadfca" vertical={false} />
          <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={74} tick={{ fontSize: 11, fill: "#5c6570" }} />
          <YAxis tickFormatter={currencyTick} width={52} tick={{ fontSize: 11, fill: "#5c6570" }} />
          <Tooltip formatter={(value) => formatUSD(Number(value))} />
          <Bar dataKey="interest" name="HELOC interest" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
