import type { ReactNode } from "react";
import { CloudUpload, DatabaseZap, RotateCcw, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { currency } from "../utils/format";

export function Operations() {
  const [upload, setUpload] = useState<Record<string, unknown> | null>(null);
  const [batch, setBatch] = useState<Record<string, unknown> | null>(null);
  const [schedule, setSchedule] = useState<Record<string, unknown> | null>(null);
  const [crm, setCrm] = useState<Record<string, unknown>[]>([]);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api.retrainingSchedule().then(setSchedule);
    api.crmSyncs().then(setCrm);
  }, []);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setBusy("upload");
    try {
      const result = await api.uploadData(file);
      setUpload(result);
      setBatch(null);
    } finally {
      setBusy("");
    }
  }

  async function handleBatchScore() {
    if (!upload?.upload_id) return;
    setBusy("score");
    try {
      setBatch(await api.batchScore(String(upload.upload_id)));
    } finally {
      setBusy("");
    }
  }

  async function updateSchedule() {
    setBusy("schedule");
    try {
      setSchedule(await api.setRetrainingSchedule({ cadence: "weekly", lookback_days: 120, metric_guardrail_roc_auc: 0.8 }));
    } finally {
      setBusy("");
    }
  }

  async function syncCrm() {
    setBusy("crm");
    try {
      const result = await api.crmSync({ provider: "Salesforce", account_count: 1500, objects: ["accounts", "opportunities", "cases"] });
      setCrm([result, ...crm]);
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="space-y-6 p-4 md:p-6">
      <section>
        <h1 className="text-2xl font-semibold text-ink">Data Operations</h1>
        <p className="mt-1 text-sm text-graphite">CSV/Excel ingestion, batch scoring, scheduled retraining, and CRM synchronization.</p>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="CSV / Excel Upload" icon={CloudUpload}>
          <input
            className="block w-full rounded-md border border-line bg-white p-2 text-sm"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => handleUpload(event.target.files?.[0])}
          />
          {upload && <Result rows={[["Upload ID", upload.upload_id], ["Rows", upload.rows], ["Status", upload.status]]} />}
          <button className="mt-4 h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={!upload || busy === "score"} onClick={handleBatchScore}>
            {busy === "score" ? "Scoring..." : "Run Batch Scoring"}
          </button>
          {batch && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Metric label="Rows scored" value={String(batch.rows_scored)} />
              <Metric label="High-risk customers" value={String(batch.high_risk_customers)} />
              <Metric label="Revenue at risk" value={currency(Number(batch.revenue_at_risk ?? 0))} />
              <Metric label="Expected saved" value={currency(Number(batch.expected_revenue_saved ?? 0))} />
            </div>
          )}
        </Panel>

        <Panel title="Scheduled Retraining" icon={RotateCcw}>
          <Result rows={[["Cadence", schedule?.cadence], ["Lookback days", schedule?.lookback_days], ["Guardrail ROC-AUC", schedule?.metric_guardrail_roc_auc], ["Next run", schedule?.next_run_at]]} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="h-10 rounded-md border border-line px-4 text-sm font-semibold text-ink" onClick={updateSchedule} disabled={busy === "schedule"}>
              Set Weekly Schedule
            </button>
            <button className="h-10 rounded-md bg-teal px-4 text-sm font-semibold text-white" onClick={() => api.runRetraining().then((result) => setSchedule(result.schedule as Record<string, unknown>))}>
              Run Retraining
            </button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="CRM Integration" icon={Workflow}>
          <p className="text-sm text-graphite">Simulated enterprise connector for Salesforce-style account, opportunity, and case syncs.</p>
          <button className="mt-4 h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white" onClick={syncCrm} disabled={busy === "crm"}>
            {busy === "crm" ? "Syncing..." : "Run CRM Sync"}
          </button>
          <div className="mt-4 divide-y divide-line">
            {crm.slice(0, 5).map((sync) => (
              <div className="grid grid-cols-[1fr_90px_80px] gap-3 py-3 text-sm" key={String(sync.sync_id)}>
                <span className="font-medium text-ink">{String(sync.provider)}</span>
                <span className="text-right text-graphite">{String(sync.accounts_matched)}</span>
                <span className="text-right text-teal">{String(sync.status)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Batch Scoring Contract" icon={DatabaseZap}>
          <p className="text-sm text-graphite">Uploads must include the same raw customer profile and behavioral fields used by the model pipeline. Scoring returns churn probability, CLV, segment, reasons, and recommended action.</p>
          <div className="mt-4 rounded-md bg-cloud p-3 text-sm text-graphite">
            Required file types: CSV, XLSX, XLS
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

function Result({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <dl className="mt-4 grid gap-2 text-sm">
      {rows.map(([label, value]) => (
        <div className="grid grid-cols-[140px_1fr] gap-3" key={label}>
          <dt className="text-graphite">{label}</dt>
          <dd className="truncate font-medium text-ink" title={String(value ?? "-")}>{String(value ?? "-")}</dd>
        </div>
      ))}
    </dl>
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
