import { X } from "lucide-react";
import type { Customer } from "../types/customer";
import { currency, percent } from "../utils/format";

type Props = {
  customer: Customer | null;
  onClose: () => void;
};

export function CustomerDetail({ customer, onClose }: Props) {
  if (!customer) return null;
  const reasons = customer.top_churn_reasons.split(";").map((item) => item.trim()).filter(Boolean);
  return (
    <aside className="fixed inset-y-0 right-0 z-20 w-full max-w-xl overflow-y-auto border-l border-line bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-graphite">{customer.segment}</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{customer.customer_id}</h2>
        </div>
        <button className="rounded-md border border-line p-2 text-graphite hover:bg-cloud" onClick={onClose} aria-label="Close customer detail">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label="Churn probability" value={percent(customer.churn_probability)} />
        <Metric label="Estimated CLV" value={currency(customer.estimated_clv)} />
        <Metric label="Revenue at risk" value={currency(customer.revenue_at_risk)} />
        <Metric label="Expected saved" value={currency(customer.expected_revenue_saved)} />
        <Metric label="Monthly revenue" value={currency(customer.monthly_revenue)} />
        <Metric label="Satisfaction / NPS" value={`${customer.satisfaction_score.toFixed(1)} / ${customer.nps_score}`} />
      </div>
      <section className="mt-5 rounded-lg border border-line p-4">
        <h3 className="font-semibold text-ink">Recommended Next Best Action</h3>
        <p className="mt-2 text-lg font-semibold text-teal">{customer.recommended_action}</p>
        <p className="mt-1 text-sm text-graphite">Priority: {customer.priority_level}</p>
      </section>
      <section className="mt-5 rounded-lg border border-line p-4">
        <h3 className="font-semibold text-ink">Top Churn Reasons</h3>
        <ul className="mt-3 space-y-2 text-sm text-graphite">
          {reasons.map((reason) => <li key={reason} className="rounded bg-cloud px-3 py-2">{reason}</li>)}
        </ul>
      </section>
      <section className="mt-5 rounded-lg border border-line p-4">
        <h3 className="font-semibold text-ink">Profile</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Item label="Region" value={customer.region} />
          <Item label="Subscription" value={customer.subscription_type} />
          <Item label="Contract" value={customer.contract_type} />
          <Item label="Priority" value={customer.priority_level} />
        </dl>
      </section>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-cloud p-3">
      <p className="text-xs text-graphite">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-graphite">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
