import { create } from "zustand";
import type { ValidationResult } from "@/lib/workflow/types";

interface ValidationStore {
  results: ValidationResult[];
  setResults: (results: ValidationResult[]) => void;
}

export const useValidationStore = create<ValidationStore>((set) => ({
  results: [],
  setResults: (results) => set({ results }),
}));
