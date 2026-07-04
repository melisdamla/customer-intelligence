import type { ReactNode } from "react";
import { Activity, FlaskConical, GitBranch, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar } from "../components/Bar";
import { api } from "../services/api";
import { currency } from "../utils/format";

export function Experimentation() {
  const [monitoring, setMonitoring] = useState<Record<string, unknown> | null>(null);
  const [runs, setRuns] = useState<Record<string, unknown>[]>([]);
  const [tests, setTests] = useState<Record<string, unknown>[]>([]);
  const [uplift, setUplift] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.monitoring().then(setMonitoring);
    api.mlflowRuns().then(setRuns);
    api.abTests().then(setTests);
    api.upliftModel().then(setUplift);
  }, []);

  async function createTest() {
    const result = await api.createAbTest({
      name: "CSM retention motion",
      control_customers: 1200,
      treatment_customers: 1250,
      control_retention_rate: 0.72,
      treatment_retention_rate: 0.785,
      average_clv: 4600,
      action_cost_per_customer: 60
    });
    setTests([result, ...tests]);
  }

  const drift = (monitoring?.data_drift as Array<Record<string, unknown>> | undefined) ?? [];
  const maxDrift = Math.max(...drift.map((row) => Number(row.drift_score)), 1);
  const topUplift = (uplift?.top_customers as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <main className="space-y-6 p-4 md:p-6">
      <section>
        <h1 className="text-2xl font-semibold text-ink">Experimentation & ML Ops</h1>
        <p className="mt-1 text-sm text-graphite">Model monitoring, MLflow run tracking, A/B decisions, and uplift-ranked action targeting.</p>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Model Monitoring" icon={Activity}>
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Population" value={String(monitoring?.population_size ?? "-")} />
            <Metric label="High-risk rate" value={`${(Number(monitoring?.high_risk_rate ?? 0) * 100).toFixed(1)}%`} />
            <Metric label="Alerts" value={String((monitoring?.alerts as unknown[] | undefined)?.length ?? 0)} />
          </div>
          <div className="mt-4 space-y-3">
            {drift.map((row) => <Bar key={String(row.feature)} label={String(row.feature)} value={Number(row.drift_score)} max={maxDrift} display={String(row.status)} />)}
          </div>
        </Panel>

        <Panel title="MLflow Runs" icon={GitBranch}>
          <div className="divide-y divide-line">
            {runs.slice(0, 5).map((run) => {
              const metrics = run.metrics as Record<string, unknown> | undefined;
              return (
                <div className="grid grid-cols-[1fr_90px_90px] gap-3 py-3 text-sm" key={String(run.run_id)}>
                  <span className="font-medium text-ink">{String(run.run_name)}</span>
                  <span className="text-right text-graphite">AUC {Number(metrics?.roc_auc ?? 0).toFixed(3)}</span>
                  <span className="text-right text-teal">{String(run.status)}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="A/B Testing" icon={FlaskConical}>
          <button className="h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white" onClick={createTest}>Analyze Retention Test</button>
          <div className="mt-4 divide-y divide-line">
            {tests.slice(0, 5).map((test) => (
              <div className="grid grid-cols-[1fr_90px_130px] gap-3 py-3 text-sm" key={String(test.experiment_id)}>
                <span className="font-medium text-ink">{String(test.name)}</span>
                <span className="text-right text-teal">{(Number(test.absolute_uplift ?? 0) * 100).toFixed(1)} pts</span>
                <span className="text-right text-graphite">{String(test.decision)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Uplift Modeling" icon={Target}>
          <div className="grid gap-3 md:grid-cols-2">
            <Metric label="Average uplift score" value={Number(uplift?.average_uplift_score ?? 0).toFixed(3)} />
            <Metric label="Incremental opportunity" value={currency(Number(uplift?.total_incremental_revenue_opportunity ?? 0))} />
          </div>
          <div className="mt-4 divide-y divide-line">
            {topUplift.slice(0, 7).map((customer) => (
              <div className="grid grid-cols-[1fr_120px_110px] gap-3 py-3 text-sm" key={String(customer.customer_id)}>
                <span className="font-medium text-ink">{String(customer.customer_id)}</span>
                <span className="text-right text-graphite">{String(customer.recommended_action)}</span>
                <span className="text-right text-teal">{currency(Number(customer.incremental_revenue_opportunity ?? 0))}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-teal" />
        <h2 className="font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </section>
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
