"use client";

import type { ReactNode } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface PaletteSectionProps {
  title: string;
  children: ReactNode;
}

export function PaletteSection({ title, children }: PaletteSectionProps) {
  return (
    <Accordion defaultValue={[title]}>
      <AccordionItem value={title}>
        <AccordionTrigger className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
          {title}
        </AccordionTrigger>
        <AccordionContent className="px-2 pb-2">
          <div className="grid grid-cols-2 gap-1.5">{children}</div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
