import { create } from "zustand";

export const RIGHT_PANEL_MIN = 240;
export const RIGHT_PANEL_MAX = 560;
export const RIGHT_PANEL_DEFAULT = 288; // w-72

export const LEFT_PANEL_MIN = 180;
export const LEFT_PANEL_MAX = 400;
export const LEFT_PANEL_DEFAULT = 240; // w-60

interface UIStore {
  leftPanelOpen: boolean;
  leftPanelWidth: number;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  rightPanelTab: "properties" | "chat";
  validationPanelOpen: boolean;
  publishDialogOpen: boolean;
  promptValue: string;
  isGenerating: boolean;
  aiProvider: "openai" | "anthropic" | "google";
  activeTraceId: string | null;

  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
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
  leftPanelWidth: LEFT_PANEL_DEFAULT,
  rightPanelOpen: true,
  rightPanelWidth: RIGHT_PANEL_DEFAULT,
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
  setLeftPanelWidth: (width) =>
    set({ leftPanelWidth: Math.min(LEFT_PANEL_MAX, Math.max(LEFT_PANEL_MIN, width)) }),
  setRightPanelWidth: (width) =>
    set({ rightPanelWidth: Math.min(RIGHT_PANEL_MAX, Math.max(RIGHT_PANEL_MIN, width)) }),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  setValidationPanelOpen: (open) => set({ validationPanelOpen: open }),
  setPublishDialogOpen: (open) => set({ publishDialogOpen: open }),
  setPromptValue: (value) => set({ promptValue: value }),
  setIsGenerating: (loading) => set({ isGenerating: loading }),
  setAiProvider: (provider) => set({ aiProvider: provider }),
  setActiveTraceId: (id) => set({ activeTraceId: id }),
}));
