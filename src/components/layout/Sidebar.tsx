"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { PaletteSection } from "@/components/palette/PaletteSection";
import { PaletteItem } from "@/components/palette/PaletteItem";
import {
  type PaletteCategory,
  CATEGORY_LABELS,
  NODE_TYPE_CATEGORIES,
  NODE_TYPE_LABELS,
} from "@/lib/workflow/types";

const CATEGORY_ORDER: PaletteCategory[] = [
  "events",
  "tasks",
  "gateways",
  "connectors",
  "logic",
  "actions",
];

export function Sidebar() {
  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex h-10 items-center border-b border-zinc-100 px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Node Palette
        </span>
      </div>
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="py-1">
          {CATEGORY_ORDER.map((category) => (
            <PaletteSection
              key={category}
              title={CATEGORY_LABELS[category]}
            >
              {NODE_TYPE_CATEGORIES[category].map((nodeType) => (
                <PaletteItem
                  key={nodeType}
                  bpmnType={nodeType}
                  label={NODE_TYPE_LABELS[nodeType]}
                />
              ))}
            </PaletteSection>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
