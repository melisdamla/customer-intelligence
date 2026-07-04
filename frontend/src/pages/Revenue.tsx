import { useEffect, useState } from "react";
import { Bar } from "../components/Bar";
import { api } from "../services/api";
import type { Customer, Metrics, SegmentSummary } from "../types/customer";
import { currency } from "../utils/format";

export function Revenue() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [segments, setSegments] = useState<SegmentSummary[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    api.metrics().then(setMetrics);
    api.segments().then(setSegments);
    api.customers("?risk_level=High&limit=12").then((data) => setCustomers(data.customers));
  }, []);

  const maxMrr = Math.max(...segments.map((segment) => segment.average_clv), 1);

  return (
    <main className="space-y-6 p-4 md:p-6">
      <section>
        <h1 className="text-2xl font-semibold text-ink">Revenue Intelligence</h1>
        <p className="mt-1 text-sm text-graphite">Commercial exposure, save potential, and high-value accounts needing attention.</p>
      </section>
      {metrics && (
        <section className="grid gap-4 md:grid-cols-3">
          <Panel label="Revenue at risk" value={currency(metrics.revenue_at_risk)} />
          <Panel label="Expected revenue saved" value={currency(metrics.expected_revenue_saved)} />
          <Panel label="Total estimated CLV" value={currency(metrics.total_estimated_clv)} />
        </section>
      )}
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-ink">Average CLV By Segment</h2>
          <div className="mt-4 space-y-3">
            {segments.map((segment) => <Bar key={segment.segment} label={segment.segment} value={segment.average_clv} max={maxMrr} display={currency(segment.average_clv)} />)}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-ink">High-Value Customers At Risk</h2>
          <div className="mt-3 divide-y divide-line">
            {customers.map((customer) => (
              <div key={customer.customer_id} className="grid grid-cols-[1fr_110px_110px] gap-3 py-3 text-sm">
                <span className="font-medium text-ink">{customer.customer_id}</span>
                <span className="text-right text-coral">{currency(customer.revenue_at_risk)}</span>
                <span className="text-right text-graphite">{customer.priority_level}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Panel({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <p className="text-sm text-graphite">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </section>
  );
}
