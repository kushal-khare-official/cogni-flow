import { create } from "zustand";

export interface IntegrationTemplateRecord {
  id: string;
  name: string;
  icon: string;
  category: string;
  type: string;
  description: string;
  baseConfig: string;
  operations: string;
  credentialSchema: string;
  mockConfig: string;
  isBuiltIn: boolean;
}

interface IntegrationStore {
  templates: IntegrationTemplateRecord[];
  loading: boolean;
  loaded: boolean;

  fetchTemplates: () => Promise<void>;
  invalidateAndRefetch: () => Promise<void>;
  getTemplate: (id: string) => IntegrationTemplateRecord | undefined;
}

export const useIntegrationStore = create<IntegrationStore>((set, get) => ({
  templates: [],
  loading: false,
  loaded: false,

  fetchTemplates: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const res = await fetch("/api/integration-templates");
      if (res.ok) {
        const data = await res.json();
        set({ templates: data.templates ?? data, loaded: true });
      }
    } catch {
      // silently fail, will retry later
    } finally {
      set({ loading: false });
    }
  },

  invalidateAndRefetch: async () => {
    set({ loaded: false });
    const store = get();
    if (store.loading) return;
    set({ loading: true });
    try {
      const res = await fetch("/api/integration-templates");
      if (res.ok) {
        const data = await res.json();
        set({ templates: data.templates ?? data, loaded: true });
      }
    } catch {
      // silently fail
    } finally {
      set({ loading: false });
    }
  },

  getTemplate: (id: string) => {
    return get().templates.find((t) => t.id === id);
  },
}));
