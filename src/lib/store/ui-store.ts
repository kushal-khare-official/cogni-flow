import { create } from "zustand";

interface UIStore {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelTab: "properties" | "chat";
  validationPanelOpen: boolean;
  publishDialogOpen: boolean;
  promptValue: string;
  isGenerating: boolean;
  aiProvider: "openai" | "anthropic" | "google";
  activeTraceId: string | null;

  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setRightPanelTab: (tab: "properties" | "chat") => void;
  setValidationPanelOpen: (open: boolean) => void;
  setPublishDialogOpen: (open: boolean) => void;
  setPromptValue: (value: string) => void;
  setIsGenerating: (loading: boolean) => void;
  setAiProvider: (provider: "openai" | "anthropic" | "google") => void;
  setActiveTraceId: (id: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  leftPanelOpen: true,
  rightPanelOpen: true,
  rightPanelTab: "properties",
  validationPanelOpen: false,
  publishDialogOpen: false,
  promptValue: "",
  isGenerating: false,
  aiProvider: "openai",
  activeTraceId: null,

  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  setValidationPanelOpen: (open) => set({ validationPanelOpen: open }),
  setPublishDialogOpen: (open) => set({ publishDialogOpen: open }),
  setPromptValue: (value) => set({ promptValue: value }),
  setIsGenerating: (loading) => set({ isGenerating: loading }),
  setAiProvider: (provider) => set({ aiProvider: provider }),
  setActiveTraceId: (id) => set({ activeTraceId: id }),
}));
