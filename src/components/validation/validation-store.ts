import { create } from "zustand";
import type { ValidationResult } from "@/lib/workflow/types";

interface ValidationStore {
  results: ValidationResult[];
  setResults: (results: ValidationResult[]) => void;
  selectedTestId: string | null;
  setSelectedTestId: (id: string | null) => void;
}

export const useValidationStore = create<ValidationStore>((set) => ({
  results: [],
  setResults: (results) => set({ results }),
  selectedTestId: null,
  setSelectedTestId: (id) => set({ selectedTestId: id }),
}));
