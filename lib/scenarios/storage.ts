import { coercePlanner } from "@/lib/finance/defaults";
import type { PlannerState } from "@/lib/finance/types";

export const DRAFT_KEY = "lbheloc.draft.v1";
export const SCENARIO_KEY = "lbheloc.scenarios.v1";

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputs: PlannerState;
}

export interface ScenarioRepository {
  list(): SavedScenario[];
  save(scenario: SavedScenario): SavedScenario[];
  delete(id: string): SavedScenario[];
}

export class LocalScenarioRepository implements ScenarioRepository {
  list(): SavedScenario[] {
    return readScenarios();
  }

  save(scenario: SavedScenario): SavedScenario[] {
    const current = readScenarios();
    const index = current.findIndex((item) => item.id === scenario.id);
    const next = [...current];
    if (index >= 0) next[index] = scenario;
    else next.unshift(scenario);
    writeScenarios(next);
    return next;
  }

  delete(id: string): SavedScenario[] {
    const next = readScenarios().filter((item) => item.id !== id);
    writeScenarios(next);
    return next;
  }
}

/**
 * Reserved for a future CRM connection. This release never sends financial
 * inputs to a server. A later adapter can implement ScenarioRepository
 * against the firm's client record system.
 */
export class CrmScenarioRepository implements ScenarioRepository {
  constructor(private readonly endpoint: string) {}

  list(): SavedScenario[] {
    throw new Error(`CRM scenario storage is not enabled (${this.endpoint}).`);
  }

  save(): SavedScenario[] {
    throw new Error("CRM scenario storage is not enabled.");
  }

  delete(): SavedScenario[] {
    throw new Error("CRM scenario storage is not enabled.");
  }
}

export function readDraft(): PlannerState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return coercePlanner(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeDraft(state: PlannerState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
}

function readScenarios(): SavedScenario[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(SCENARIO_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavedScenario[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      inputs: coercePlanner(item.inputs),
    }));
  } catch {
    return [];
  }
}

function writeScenarios(scenarios: SavedScenario[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SCENARIO_KEY, JSON.stringify(scenarios));
  window.dispatchEvent(new Event("lbheloc-scenarios"));
}
