import { create } from "zustand";

export interface IntegrationRecord {
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
  integrations: IntegrationRecord[];
  loading: boolean;
  loaded: boolean;

  fetchIntegrations: () => Promise<void>;
  invalidateAndRefetch: () => Promise<void>;
  getIntegration: (id: string) => IntegrationRecord | undefined;
}

export const useIntegrationStore = create<IntegrationStore>((set, get) => ({
  integrations: [],
  loading: false,
  loaded: false,

  fetchIntegrations: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        set({ integrations: data.integrations ?? data, loaded: true });
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
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        set({ integrations: data.integrations ?? data, loaded: true });
      }
    } catch {
      // silently fail
    } finally {
      set({ loading: false });
    }
  },

  getIntegration: (id: string) => {
    return get().integrations.find((t) => t.id === id);
  },
}));
