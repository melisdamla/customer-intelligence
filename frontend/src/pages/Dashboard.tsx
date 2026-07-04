import { AlertTriangle, Banknote, HeartPulse, LineChart, ShieldCheck, TrendingUp, Users, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomerDetail } from "../components/CustomerDetail";
import { CustomerTable } from "../components/CustomerTable";
import { KpiCard } from "../components/KpiCard";
import { api } from "../services/api";
import type { Customer, Metrics, SegmentSummary } from "../types/customer";
import { compact, currency } from "../utils/format";

export function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [segments, setSegments] = useState<SegmentSummary[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [filters, setFilters] = useState({ risk: "", segment: "", priority: "", subscription: "", region: "" });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.risk) params.set("risk_level", filters.risk);
    if (filters.segment) params.set("segment", filters.segment);
    if (filters.priority) params.set("priority_level", filters.priority);
    if (filters.subscription) params.set("subscription_type", filters.subscription);
    if (filters.region) params.set("region", filters.region);
    params.set("limit", "150");
    return `?${params.toString()}`;
  }, [filters]);

  useEffect(() => {
    api.metrics().then(setMetrics);
    api.segments().then(setSegments);
  }, []);

  useEffect(() => {
    api.customers(query).then((data) => setCustomers(data.customers));
  }, [query]);

  if (!metrics) {
    return <div className="p-8 text-graphite">Loading customer intelligence...</div>;
  }

  const segmentOptions = segments.map((segment) => segment.segment);

  return (
    <main className="space-y-6 p-4 md:p-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Customers" value={compact(metrics.total_customers)} detail="Portfolio population" icon={Users} />
        <KpiCard label="Predicted Churn Rate" value={`${metrics.predicted_churn_rate.toFixed(1)}%`} detail="Model probability average" icon={AlertTriangle} tone="risk" />
        <KpiCard label="High-Risk Customers" value={compact(metrics.high_risk_customers)} detail="High and critical accounts" icon={HeartPulse} tone="risk" />
        <KpiCard label="Monthly Recurring Revenue" value={currency(metrics.total_monthly_recurring_revenue)} detail="Current monthly revenue" icon={Banknote} />
        <KpiCard label="Estimated CLV" value={currency(metrics.total_estimated_clv)} detail="Modeled future value" icon={WalletCards} />
        <KpiCard label="Revenue At Risk" value={currency(metrics.revenue_at_risk)} detail="CLV weighted by churn risk" icon={LineChart} tone="risk" />
        <KpiCard label="Expected Revenue Saved" value={currency(metrics.expected_revenue_saved)} detail="Action-adjusted value" icon={ShieldCheck} tone="success" />
        <KpiCard label="Customer Sentiment" value={`${metrics.average_satisfaction_score.toFixed(1)} / ${metrics.average_nps_score.toFixed(0)}`} detail="Avg satisfaction / NPS" icon={TrendingUp} />
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <Select label="Risk" value={filters.risk} options={["Critical", "High", "Medium", "Low"]} onChange={(risk) => setFilters({ ...filters, risk })} />
          <Select label="Segment" value={filters.segment} options={segmentOptions} onChange={(segment) => setFilters({ ...filters, segment })} />
          <Select label="Priority" value={filters.priority} options={["Critical", "High", "Medium", "Low"]} onChange={(priority) => setFilters({ ...filters, priority })} />
          <Select label="Subscription" value={filters.subscription} options={["Basic", "Professional", "Business", "Enterprise"]} onChange={(subscription) => setFilters({ ...filters, subscription })} />
          <Select label="Region" value={filters.region} options={["North America", "Europe", "Asia Pacific", "Latin America", "Middle East & Africa"]} onChange={(region) => setFilters({ ...filters, region })} />
        </div>
      </section>

      <CustomerTable customers={customers} onSelect={setSelected} />
      <CustomerDetail customer={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-medium text-graphite">
      {label}
      <select className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
