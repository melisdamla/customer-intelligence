import { Search } from "lucide-react";
import type { Customer } from "../types/customer";
import { currency, percent } from "../utils/format";

type Props = {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
};

const priorityClass: Record<string, string> = {
  Critical: "bg-[#FBE9E4] text-coral",
  High: "bg-[#FFF4D8] text-amber",
  Medium: "bg-[#EAF4F4] text-teal",
  Low: "bg-[#EEF2F4] text-graphite"
};

export function CustomerTable({ customers, onSelect }: Props) {
  return (
    <section className="rounded-lg border border-line bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-base font-semibold text-ink">Customer Intelligence Table</h2>
        <div className="flex h-10 min-w-64 items-center gap-2 rounded-md border border-line px-3 text-sm text-graphite">
          <Search className="h-4 w-4" aria-hidden />
          <span>Use filters above to refine accounts</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-cloud text-left text-xs uppercase text-graphite">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Segment</th>
              <th className="px-4 py-3">Churn</th>
              <th className="px-4 py-3">CLV</th>
              <th className="px-4 py-3">Revenue Risk</th>
              <th className="px-4 py-3">Sat / NPS</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {customers.map((customer) => (
              <tr key={customer.customer_id} className="cursor-pointer hover:bg-[#F8FAFA]" onClick={() => onSelect(customer)}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{customer.customer_id}</td>
                <td className="max-w-56 px-4 py-3 text-graphite">{customer.segment}</td>
                <td className="px-4 py-3 font-semibold text-coral">{percent(customer.churn_probability)}</td>
                <td className="px-4 py-3">{currency(customer.estimated_clv)}</td>
                <td className="px-4 py-3">{currency(customer.revenue_at_risk)}</td>
                <td className="px-4 py-3">{customer.satisfaction_score.toFixed(1)} / {customer.nps_score}</td>
                <td className="max-w-64 px-4 py-3 text-graphite">{customer.recommended_action}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${priorityClass[customer.priority_level] ?? priorityClass.Low}`}>
                    {customer.priority_level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
