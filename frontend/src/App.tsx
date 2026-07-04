import { BarChart3, BrainCircuit, LayoutDashboard, LineChart, UsersRound } from "lucide-react";
import { useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { ModelPerformancePage } from "./pages/ModelPerformance";
import { Revenue } from "./pages/Revenue";
import { Segmentation } from "./pages/Segmentation";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "segments", label: "Segments", icon: UsersRound },
  { id: "revenue", label: "Revenue", icon: LineChart },
  { id: "model", label: "Model", icon: BrainCircuit }
] as const;

type Tab = (typeof tabs)[number]["id"];

export default function App() {
  const [active, setActive] = useState<Tab>("dashboard");

  return (
    <div className="min-h-screen bg-cloud text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-white">
        <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-ink">Enterprise Customer Intelligence Platform</h1>
              <p className="text-sm text-graphite">Churn, CLV, segmentation, explainability, and retention actions</p>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium ${active === tab.id ? "bg-ink text-white" : "text-graphite hover:bg-cloud"}`}
                  onClick={() => setActive(tab.id)}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>
      {active === "dashboard" && <Dashboard />}
      {active === "segments" && <Segmentation />}
      {active === "revenue" && <Revenue />}
      {active === "model" && <ModelPerformancePage />}
    </div>
  );
}
