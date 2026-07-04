import type { DragEvent, ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  DatabaseZap,
  Download,
  FileSpreadsheet,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Workflow
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "../components/KpiCard";
import { api } from "../services/api";
import { currency, percent } from "../utils/format";

type SchemaCategory = {
  category: string;
  columns: string[];
};

type PreviewRow = {
  customer_id: string;
  churn_probability: number;
  estimated_clv: number;
  revenue_at_risk: number;
  segment: string;
  recommended_action: string;
  priority: string;
};

const maxFileSize = "50 MB";
const allowedExtensions = [".csv", ".xlsx", ".xls"];

export function Operations() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<Record<string, unknown> | null>(null);
  const [validation, setValidation] = useState<Record<string, unknown> | null>(null);
  const [schema, setSchema] = useState<SchemaCategory[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [crmStatus, setCrmStatus] = useState<Record<string, unknown> | null>(null);
  const [retraining, setRetraining] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Record<string, string>[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const validationReady = validation?.status_badge === "Ready";

  useEffect(() => {
    api.operationsValidationSummary().then(setValidation);
    api.operationsSchema().then((data) => setSchema(data.required_categories as SchemaCategory[]));
    api.operationsScoringPreview().then((data) => setPreview(data.rows as PreviewRow[]));
    api.operationsCrmStatus().then(setCrmStatus);
    api.operationsRetrainingStatus().then(setRetraining);
    api.operationsDataQualityAlerts().then(setAlerts);
  }, []);

  const kpis = useMemo(
    () => [
      { label: "Last Upload", value: `${Number(validation?.rows_detected ?? 15000).toLocaleString()} rows`, detail: "Latest validated file", icon: FileSpreadsheet },
      { label: "Validation Score", value: `${validation?.schema_compatibility_score ?? 94}%`, detail: "Schema compatibility", icon: ShieldCheck, tone: "success" as const },
      { label: "Last Batch Score", value: "15,000 customers", detail: "Scored customer records", icon: DatabaseZap },
      { label: "CRM Sync Status", value: String(crmStatus?.status ?? "Completed"), detail: "Latest CRM push", icon: Workflow, tone: "success" as const },
      { label: "Active Model Version", value: String(retraining?.model_version ?? "v1.4.2"), detail: "Production model", icon: RefreshCw },
      { label: "Next Retraining", value: "7 days", detail: "Weekly cadence", icon: RotateCcw }
    ],
    [crmStatus?.status, retraining?.model_version, validation?.rows_detected, validation?.schema_compatibility_score]
  );

  function validateFile(file: File) {
    const lowerName = file.name.toLowerCase();
    const validType = allowedExtensions.some((extension) => lowerName.endsWith(extension));
    if (!validType) {
      setError("Unsupported file type. Upload a CSV, XLSX, or XLS file.");
      setSelectedFile(null);
      setUploadProgress(0);
      return;
    }
    setError("");
    setSelectedFile(file);
    setUploadProgress(35);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    validateFile(event.dataTransfer.files[0]);
  }

  async function validateDataset() {
    if (!selectedFile) {
      setError("Select a CSV or Excel dataset before validation.");
      return;
    }
    setBusy("validate");
    setUploadProgress(68);
    try {
      const uploadResult = await api.operationsUpload(selectedFile);
      setUpload(uploadResult);
      const validationResult = await api.operationsValidate({ upload_id: uploadResult.upload_id });
      setValidation(validationResult);
      setUploadProgress(100);
    } finally {
      setBusy("");
    }
  }

  async function runBatchScoring() {
    setBusy("score");
    try {
      const result = await api.operationsBatchScore(upload?.upload_id ? { upload_id: upload.upload_id } : {});
      const scoredPreview = (result.preview as PreviewRow[] | undefined) ?? preview;
      setPreview(scoredPreview);
    } finally {
      setBusy("");
    }
  }

  async function runCrmSync() {
    setBusy("crm");
    try {
      await api.operationsCrmSync({ provider: "Salesforce", account_count: 1500, objects: ["accounts", "opportunities", "cases"] });
      setCrmStatus(await api.operationsCrmStatus());
    } finally {
      setBusy("");
    }
  }

  async function runRetraining() {
    setBusy("retrain");
    try {
      await api.operationsRetrain();
      setRetraining(await api.operationsRetrainingStatus());
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="space-y-6 p-4 md:p-6">
      <section>
        <h1 className="text-2xl font-semibold text-ink">Data Operations</h1>
        <p className="mt-1 text-sm text-graphite">Enterprise ingestion, validation, batch scoring, CRM synchronization, and model retraining workflows.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Customer Data Upload" icon={CloudUpload} subtitle="Upload CSV or Excel customer datasets for churn prediction, CLV estimation, segmentation, and next-best-action recommendations.">
          <label
            className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${error ? "border-coral bg-[#FFF7F3]" : "border-line bg-cloud hover:border-teal"}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <CloudUpload className="h-9 w-9 text-teal" aria-hidden />
            <span className="mt-3 text-sm font-semibold text-ink">Drag and drop a customer file here</span>
            <span className="mt-1 text-sm text-graphite">Supported formats: CSV, XLSX, XLS. Maximum file size: {maxFileSize}.</span>
            <input
              className="sr-only"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => event.target.files?.[0] && validateFile(event.target.files[0])}
            />
            {selectedFile && <span className="mt-3 rounded bg-white px-3 py-1 text-sm font-medium text-ink">{selectedFile.name}</span>}
            {error && <span className="mt-3 text-sm font-semibold text-coral">{error}</span>}
          </label>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-graphite">
              <span>Upload progress</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#E7ECEF]">
              <div className="h-2 rounded-full bg-teal transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button icon={ShieldCheck} onClick={validateDataset} disabled={!selectedFile || busy === "validate"}>{busy === "validate" ? "Validating..." : "Validate Dataset"}</Button>
            <Button icon={DatabaseZap} onClick={runBatchScoring} disabled={!validationReady || busy === "score"}>{busy === "score" ? "Scoring..." : "Run Batch Scoring"}</Button>
            <Button icon={Download} variant="secondary">Download Template</Button>
          </div>
        </Panel>

        <Panel title="Data Validation Summary" icon={CheckCircle2}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <StatusBadge status={String(validation?.status_badge ?? "Ready")} />
            <span className="text-sm font-medium text-graphite">{String(validation?.status ?? "Ready for scoring")}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Rows detected" value={Number(validation?.rows_detected ?? 15000).toLocaleString()} />
            <Metric label="Columns detected" value={String(validation?.columns_detected ?? 28)} />
            <Metric label="Required columns found" value={String(validation?.required_columns_found ?? "26 / 28")} />
            <Metric label="Missing values" value={Number(validation?.missing_values ?? 342).toLocaleString()} />
            <Metric label="Duplicate customer IDs" value={String(validation?.duplicate_customer_ids ?? 0)} />
            <Metric label="Invalid values" value={String(validation?.invalid_values ?? 17)} />
            <Metric label="Schema compatibility" value={`${validation?.schema_compatibility_score ?? 94}%`} />
            <Metric label="Validation status" value={String(validation?.status_badge ?? "Ready")} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Data Schema Requirements" icon={FileSpreadsheet}>
          <p className="text-sm text-graphite">Uploaded files must include the required customer profile, revenue, engagement, support, and subscription fields. After validation, the platform returns churn probability, CLV, customer segment, churn drivers, priority level, and recommended next-best action.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {schema.map((group) => (
              <div className="rounded-lg border border-line bg-cloud p-3" key={group.category}>
                <h3 className="text-sm font-semibold text-ink">{group.category}</h3>
                <ul className="mt-2 space-y-1 text-xs text-graphite">
                  {group.columns.map((column) => <li key={column}>{column}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-md bg-[#F0FAF8] px-3 py-2 text-sm text-teal">Optional columns improve prediction quality but are not mandatory.</p>
        </Panel>

        <Panel title="Batch Scoring Results Preview" icon={DatabaseZap}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-cloud text-left text-xs uppercase text-graphite">
                <tr>
                  <th className="px-3 py-3">Customer ID</th>
                  <th className="px-3 py-3">Churn Probability</th>
                  <th className="px-3 py-3">Estimated CLV</th>
                  <th className="px-3 py-3">Revenue at Risk</th>
                  <th className="px-3 py-3">Segment</th>
                  <th className="px-3 py-3">Recommended Action</th>
                  <th className="px-3 py-3">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.map((row) => (
                  <tr key={row.customer_id}>
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-ink">{row.customer_id}</td>
                    <td className="px-3 py-3 font-semibold text-coral">{percent(row.churn_probability)}</td>
                    <td className="px-3 py-3">{currency(row.estimated_clv)}</td>
                    <td className="px-3 py-3">{currency(row.revenue_at_risk)}</td>
                    <td className="min-w-44 px-3 py-3 text-graphite">{row.segment.replace(" Customers", "")}</td>
                    <td className="min-w-48 px-3 py-3 text-graphite">{toTitle(row.recommended_action)}</td>
                    <td className="px-3 py-3"><StatusBadge status={row.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button icon={Download} variant="secondary">Export Scored CSV</Button>
            <Button icon={FileSpreadsheet} variant="secondary">Export Business Report</Button>
            <Button icon={Send}>Send to CRM</Button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="CRM Synchronization" icon={Workflow} subtitle="Simulated enterprise connector for syncing scored customer intelligence with CRM platforms.">
          <div className="mb-4 flex flex-wrap gap-2">
            {((crmStatus?.providers as string[] | undefined) ?? ["Salesforce", "HubSpot", "Microsoft Dynamics"]).map((provider) => (
              <span className="rounded bg-cloud px-3 py-1 text-xs font-semibold text-graphite" key={provider}>{provider}</span>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Accounts synced" value={Number(crmStatus?.accounts_synced ?? 1455).toLocaleString()} />
            <Metric label="Opportunities synced" value={String(crmStatus?.opportunities_synced ?? 324)} />
            <Metric label="Support cases synced" value={String(crmStatus?.support_cases_synced ?? 812)} />
            <Metric label="Recommendations pushed" value={Number(crmStatus?.recommendations_pushed ?? 1120).toLocaleString()} />
            <Metric label="Last sync" value={formatTimestamp(crmStatus?.last_sync)} />
            <Metric label="Status" value={String(crmStatus?.status ?? "Completed")} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button icon={RefreshCw} onClick={runCrmSync} disabled={busy === "crm"}>{busy === "crm" ? "Syncing..." : "Run CRM Sync"}</Button>
            <Button icon={FileSpreadsheet} variant="secondary">View Sync Logs</Button>
          </div>
        </Panel>

        <Panel title="Scheduled Retraining" icon={RotateCcw}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Retraining cadence" value={String(retraining?.retraining_cadence ?? "Weekly")} />
            <Metric label="Lookback window" value={String(retraining?.lookback_window ?? "90 days")} />
            <Metric label="Current model ROC-AUC" value={Number(retraining?.current_model_roc_auc ?? 0.78).toFixed(3)} />
            <Metric label="Last training run" value={formatTimestamp(retraining?.last_training_run)} />
            <Metric label="Next scheduled run" value={formatTimestamp(retraining?.next_scheduled_run)} />
            <Metric label="Training dataset size" value={String(retraining?.training_dataset_size ?? "15,000 customers")} />
            <Metric label="Model version" value={String(retraining?.model_version ?? "v1.4.2")} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button icon={RotateCcw} variant="secondary">Set Weekly Schedule</Button>
            <Button icon={RefreshCw} onClick={runRetraining} disabled={busy === "retrain"}>{busy === "retrain" ? "Training..." : "Run Retraining"}</Button>
            <Button icon={FileSpreadsheet} variant="secondary">View Training Logs</Button>
          </div>
          <LogList logs={(retraining?.logs as string[] | undefined) ?? []} />
        </Panel>
      </section>

      <Panel title="Data Quality Alerts" icon={AlertTriangle}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {alerts.map((alert) => (
            <div className="rounded-lg border border-line bg-cloud p-4" key={alert.message}>
              <StatusBadge status={alert.severity} />
              <p className="mt-3 text-sm font-medium text-ink">{alert.message}</p>
            </div>
          ))}
        </div>
      </Panel>
    </main>
  );
}

function Panel({ title, icon: Icon, subtitle, children }: { title: string; icon: LucideIcon; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0FAF8] text-teal">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-graphite">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Button({ children, icon: Icon, onClick, disabled = false, variant = "primary" }: { children: ReactNode; icon: LucideIcon; onClick?: () => void; disabled?: boolean; variant?: "primary" | "secondary" }) {
  const classes = variant === "primary"
    ? "bg-ink text-white hover:bg-graphite disabled:bg-graphite"
    : "border border-line bg-white text-ink hover:bg-cloud disabled:text-graphite";
  return (
    <button className={`flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${classes}`} onClick={onClick} disabled={disabled}>
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-cloud p-3">
      <p className="text-xs text-graphite">{label}</p>
      <p className="mt-1 break-words font-semibold text-ink">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes("critical") || normalized.includes("failed") || normalized.includes("high")
    ? "bg-[#FBE9E4] text-coral"
    : normalized.includes("warning") || normalized.includes("medium")
      ? "bg-[#FFF4D8] text-amber"
      : "bg-[#EAF4F4] text-teal";
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function LogList({ logs }: { logs: string[] }) {
  return (
    <div className="mt-4 rounded-lg border border-line bg-[#172026] p-4 text-sm text-white">
      <p className="mb-2 text-xs uppercase text-[#B8DDD8]">Training log</p>
      <div className="space-y-2">
        {logs.map((log) => (
          <div className="flex items-center gap-2" key={log}>
            <CheckCircle2 className="h-4 w-4 text-[#84DCCF]" aria-hidden />
            <span>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimestamp(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function toTitle(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
