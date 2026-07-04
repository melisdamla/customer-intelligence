import { useEffect, useState } from "react";
import { Bar } from "../components/Bar";
import { api } from "../services/api";
import type { FeatureImportance, ModelPerformance } from "../types/customer";

export function ModelPerformancePage() {
  const [performance, setPerformance] = useState<ModelPerformance>({});
  const [importance, setImportance] = useState<FeatureImportance[]>([]);

  useEffect(() => {
    api.performance().then(setPerformance);
    api.importance().then(setImportance);
  }, []);

  const main = performance.main_xgboost_model ?? {};
  const baseline = performance.baseline_logistic_regression ?? {};
  const confusionMatrix = normalizeMatrix(main.confusion_matrix);
  const maxImportance = Math.max(...importance.map((item) => item.importance), 1);

  return (
    <main className="space-y-6 p-4 md:p-6">
      <section>
        <h1 className="text-2xl font-semibold text-ink">Model Performance</h1>
        <p className="mt-1 text-sm text-graphite">{performance.modeling_note ?? "Model artifacts will appear after the training pipeline runs."}</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="ROC-AUC" value={display(main.roc_auc)} />
        <Metric label="Recall" value={display(main.recall)} />
        <Metric label="Precision" value={display(main.precision)} />
        <Metric label="F1-score" value={display(main.f1_score)} />
        <Metric label="Accuracy" value={display(main.accuracy)} />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-ink">Feature Importance</h2>
          <div className="mt-4 space-y-3">
            {importance.slice(0, 12).map((item) => <Bar key={item.feature} label={item.feature} value={item.importance} max={maxImportance} display={item.importance.toFixed(3)} />)}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-ink">Baseline vs Main Model</h2>
          <table className="mt-4 min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-graphite">
              <tr><th className="py-2">Metric</th><th>Logistic Regression</th><th>XGBoost</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {["roc_auc", "recall", "precision", "f1_score", "accuracy"].map((metric) => (
                <tr key={metric}>
                  <td className="py-3 font-medium text-ink">{metric}</td>
                  <td>{display(baseline[metric])}</td>
                  <td>{display(main[metric])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ConfusionMatrix matrix={confusionMatrix} threshold={main.threshold} />
        </div>
      </section>
    </main>
  );
}

function display(value: unknown): string {
  return typeof value === "number" ? value.toFixed(3) : "-";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <p className="text-sm text-graphite">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </section>
  );
}

function normalizeMatrix(value: unknown): number[][] {
  if (!Array.isArray(value) || value.length !== 2) {
    return [[0, 0], [0, 0]];
  }
  return value.map((row) => Array.isArray(row) ? row.map((cell) => Number(cell) || 0).slice(0, 2) : [0, 0]);
}

function ConfusionMatrix({ matrix, threshold }: { matrix: number[][]; threshold: unknown }) {
  const [[trueNegative, falsePositive], [falseNegative, truePositive]] = matrix;
  return (
    <section className="mt-5 rounded-lg border border-line bg-cloud p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-ink">Confusion Matrix</h3>
        <span className="text-xs font-medium text-graphite">Decision threshold: {display(threshold)}</span>
      </div>
      <div className="mt-4 grid grid-cols-[92px_repeat(2,minmax(96px,1fr))] gap-2 text-center text-sm">
        <div />
        <div className="rounded-md bg-white px-2 py-2 font-semibold text-graphite">Predicted 0</div>
        <div className="rounded-md bg-white px-2 py-2 font-semibold text-graphite">Predicted 1</div>
        <div className="flex items-center justify-center rounded-md bg-white px-2 py-2 font-semibold text-graphite">Actual 0</div>
        <MatrixCell label="True Negative" value={trueNegative} tone="success" />
        <MatrixCell label="False Positive" value={falsePositive} tone="warning" />
        <div className="flex items-center justify-center rounded-md bg-white px-2 py-2 font-semibold text-graphite">Actual 1</div>
        <MatrixCell label="False Negative" value={falseNegative} tone="risk" />
        <MatrixCell label="True Positive" value={truePositive} tone="success" />
      </div>
      <p className="mt-3 text-xs text-graphite">Format: [[TN, FP], [FN, TP]] = {JSON.stringify(matrix)}</p>
    </section>
  );
}

function MatrixCell({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "risk" }) {
  const toneClass = {
    success: "bg-[#EAF4F4] text-teal",
    warning: "bg-[#FFF4D8] text-amber",
    risk: "bg-[#FBE9E4] text-coral"
  };
  return (
    <div className={`rounded-md px-3 py-3 ${toneClass[tone]}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
