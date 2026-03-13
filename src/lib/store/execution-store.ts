import { create } from "zustand";

export interface ExecutionRunRecord {
  id: string;
  workflowId: string;
  trigger: string;
  status: string;
  input: string;
  output: string;
  context: string;
  trace: string;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

interface ExecutionStore {
  isExecuting: boolean;
  activeRun: ExecutionRunRecord | null;
  history: ExecutionRunRecord[];
  executionPanelOpen: boolean;

  setIsExecuting: (v: boolean) => void;
  setActiveRun: (run: ExecutionRunRecord | null) => void;
  addToHistory: (run: ExecutionRunRecord) => void;
  setHistory: (runs: ExecutionRunRecord[]) => void;
  setExecutionPanelOpen: (open: boolean) => void;
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  isExecuting: false,
  activeRun: null,
  history: [],
  executionPanelOpen: false,

  setIsExecuting: (v) => set({ isExecuting: v }),
  setActiveRun: (run) => set({ activeRun: run }),
  addToHistory: (run) =>
    set((s) => ({
      history: [run, ...s.history.filter((r) => r.id !== run.id)].slice(0, 50),
    })),
  setHistory: (runs) => set({ history: runs }),
  setExecutionPanelOpen: (open) => set({ executionPanelOpen: open }),
}));
