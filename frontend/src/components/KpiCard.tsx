import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "neutral" | "risk" | "success";
};

const toneClass = {
  neutral: "bg-white text-ink border-line",
  risk: "bg-[#FFF7F3] text-coral border-[#F0C7BA]",
  success: "bg-[#F0FAF8] text-teal border-[#B8DDD8]"
};

export function KpiCard({ label, value, detail, icon: Icon, tone = "neutral" }: Props) {
  return (
    <section className={`rounded-lg border p-4 shadow-sm ${toneClass[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-graphite">{label}</p>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-normal">{value}</p>
      <p className="mt-1 text-xs text-graphite">{detail}</p>
    </section>
  );
}
