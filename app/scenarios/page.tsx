"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { TextField } from "@/components/fields";
import { PageIntro } from "@/components/metric";
import { usePlanner } from "@/components/planner-provider";
import { Button } from "@/components/ui/button";
import { coercePlanner, createId, SCENARIO_NAMES } from "@/lib/finance/defaults";
import type { PlannerState } from "@/lib/finance/types";
import { safeSimulation } from "@/lib/finance/analyze";
import { formatUSD } from "@/lib/finance/money";
import { LocalScenarioRepository, SCENARIO_KEY, type SavedScenario } from "@/lib/scenarios/storage";

export default function ScenariosPage() {
  const { state, setState, loadScenario, resetExample } = usePlanner();
  const repository = useMemo(() => new LocalScenarioRepository(), []);
  const stored = useSyncExternalStore(
    (onStoreChange) => {
      const notify = () => onStoreChange();
      window.addEventListener("lbheloc-scenarios", notify);
      window.addEventListener("storage", notify);
      return () => {
        window.removeEventListener("lbheloc-scenarios", notify);
        window.removeEventListener("storage", notify);
      };
    },
    () => window.localStorage.getItem(SCENARIO_KEY) ?? "[]",
    () => "[]",
  );
  const saved = useMemo(() => {
    try {
      const parsed = JSON.parse(stored) as SavedScenario[];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ({ ...item, inputs: coercePlanner(item.inputs) }));
    } catch {
      return [];
    }
  }, [stored]);
  const [selected, setSelected] = useState<string[]>([]);

  const comparison = selected
    .map((id) => saved.find((item) => item.id === id))
    .filter((item): item is SavedScenario => Boolean(item))
    .map((item) => ({ item, outcome: safeSimulation(item.inputs) }));

  function persist(next: PlannerState, name = next.scenarioName) {
    const now = new Date().toISOString();
    const scenario: SavedScenario = {
      id: next.scenarioId || createId("scenario"),
      name,
      createdAt: saved.find((item) => item.id === next.scenarioId)?.createdAt ?? now,
      updatedAt: now,
      inputs: { ...next, scenarioName: name, scenarioId: next.scenarioId || createId("scenario") },
    };
    scenario.inputs.scenarioId = scenario.id;
    repository.save(scenario);
    setState(scenario.inputs);
  }

  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="Module 8" title="Scenarios">
        <p>
          Save the current inputs under a workshop name, duplicate them, and compare up to three side by side. Everything is stored in this browser. Nothing is sent to a client database.
        </p>
      </PageIntro>
      <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_auto_auto]">
        <TextField label="Current scenario name" value={state.scenarioName} onChange={(value) => setState((current) => ({ ...current, scenarioName: value }))} />
        <Button type="button" className="self-end" onClick={() => persist(state)}>Save scenario</Button>
        <Button type="button" variant="outline" className="self-end" onClick={resetExample}>Reload workshop example</Button>
      </section>
      <div className="flex flex-wrap gap-2">
        {SCENARIO_NAMES.map((name) => (
          <Button key={name} type="button" variant="secondary" onClick={() => persist({ ...state, scenarioId: createId("scenario"), scenarioName: name }, name)}>
            Save as {name}
          </Button>
        ))}
      </div>
      <div className="grid gap-3">
        {saved.length === 0 ? <p className="text-sm text-muted-foreground">No saved scenarios yet.</p> : null}
        {saved.map((scenario) => {
          const checked = selected.includes(scenario.id);
          return (
            <article key={scenario.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  onChange={() =>
                    setSelected((current) => {
                      if (current.includes(scenario.id)) return current.filter((id) => id !== scenario.id);
                      if (current.length >= 3) return current;
                      return [...current, scenario.id];
                    })
                  }
                />
                <span>
                  <span className="block font-medium text-[#10243f]">{scenario.name}</span>
                  <span className="block text-xs text-muted-foreground">Updated {new Date(scenario.updatedAt).toLocaleString()}</span>
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => loadScenario(scenario.inputs)}>Open</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const copyId = createId("scenario");
                    const copy: SavedScenario = {
                      ...scenario,
                      id: copyId,
                      name: `${scenario.name} copy`,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      inputs: { ...scenario.inputs, scenarioId: copyId, scenarioName: `${scenario.name} copy` },
                    };
                    repository.save(copy);
                  }}
                >
                  Duplicate
                </Button>
                <Button type="button" variant="ghost" onClick={() => { repository.delete(scenario.id); setSelected((current) => current.filter((id) => id !== scenario.id)); }}>
                  Delete
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {comparison.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-[#10243f] text-left text-[#f7f3ea]">
              <tr>
                {["Scenario", "Strategy", "Payoff", "HELOC interest", "Remaining debt"].map((heading) => (
                  <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map(({ item, outcome }) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-3 py-3">{item.name}</td>
                  <td className="px-3 py-3">{outcome.result?.strategyName ?? outcome.error}</td>
                  <td className="px-3 py-3">{outcome.result?.payoffLabel ?? "—"}</td>
                  <td className="num px-3 py-3">{outcome.result ? formatUSD(outcome.result.totalInterestCharged) : "—"}</td>
                  <td className="num px-3 py-3">{outcome.result ? formatUSD(outcome.result.householdDebtEnd) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
