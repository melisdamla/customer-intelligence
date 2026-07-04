import { useEffect, useState } from "react";
import { Bar } from "../components/Bar";
import { api } from "../services/api";
import type { SegmentSummary } from "../types/customer";
import { currency, percent } from "../utils/format";

export function Segmentation() {
  const [segments, setSegments] = useState<SegmentSummary[]>([]);

  useEffect(() => {
    api.segments().then(setSegments);
  }, []);

  const maxCustomers = Math.max(...segments.map((segment) => segment.customer_count), 1);
  const maxRisk = Math.max(...segments.map((segment) => segment.revenue_at_risk), 1);

  return (
    <main className="space-y-6 p-4 md:p-6">
      <section>
        <h1 className="text-2xl font-semibold text-ink">Segmentation</h1>
        <p className="mt-1 text-sm text-graphite">Customer groups ranked by risk, value, satisfaction, and strategic response.</p>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-ink">Segment Distribution</h2>
          <div className="mt-4 space-y-3">
            {segments.map((segment) => <Bar key={segment.segment} label={segment.segment} value={segment.customer_count} max={maxCustomers} display={segment.customer_count.toLocaleString()} />)}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-ink">Revenue At Risk By Segment</h2>
          <div className="mt-4 space-y-3">
            {segments.map((segment) => <Bar key={segment.segment} label={segment.segment} value={segment.revenue_at_risk} max={maxRisk} display={currency(segment.revenue_at_risk)} />)}
          </div>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {segments.map((segment) => (
          <article key={segment.segment} className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-semibold text-ink">{segment.segment}</h2>
              <span className="rounded bg-cloud px-2 py-1 text-xs font-semibold text-graphite">{segment.customer_count.toLocaleString()}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <Metric label="Avg churn" value={percent(segment.average_churn_probability)} />
              <Metric label="Avg CLV" value={currency(segment.average_clv)} />
              <Metric label="Satisfaction" value={segment.average_satisfaction_score.toFixed(1)} />
            </div>
            <p className="mt-4 text-sm text-graphite">{segment.recommended_business_strategy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-graphite">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
