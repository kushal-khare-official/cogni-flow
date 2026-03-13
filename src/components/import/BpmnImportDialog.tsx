"use client";

import { useState, useRef } from "react";
import { FileUp, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useWorkflowStore } from "@/lib/store/workflow-store";

export function BpmnImportDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [xmlContent, setXmlContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    nodes: any[];
    edges: any[];
    warnings: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setWorkflow = useWorkflowStore((s) => s.setWorkflow);

  async function handleParse(xml: string) {
    if (!xml.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const res = await fetch("/api/bpmn/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Parse failed");
        return;
      }

      setPreview({
        nodes: data.nodes,
        edges: data.edges,
        warnings: data.warnings,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setXmlContent(text);
      handleParse(text);
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!preview) return;
    setWorkflow({ nodes: preview.nodes, edges: preview.edges });
    setOpen(false);
    setPreview(null);
    setXmlContent("");
  }

  function handleClose() {
    setOpen(false);
    setPreview(null);
    setXmlContent("");
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? setOpen(true) : handleClose())}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <FileUp className="size-3.5" />
            Import
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import BPMN XML</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            variant={mode === "file" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("file")}
            className="text-xs"
          >
            Upload File
          </Button>
          <Button
            variant={mode === "paste" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("paste")}
            className="text-xs"
          >
            Paste XML
          </Button>
        </div>

        {mode === "file" ? (
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">
              Select a .bpmn or .xml file
            </Label>
            <input
              ref={fileRef}
              type="file"
              accept=".bpmn,.xml"
              onChange={handleFileChange}
              className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={xmlContent}
              onChange={(e) => setXmlContent(e.target.value)}
              rows={10}
              placeholder="Paste BPMN 2.0 XML here..."
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              onClick={() => handleParse(xmlContent)}
              disabled={loading || !xmlContent.trim()}
              className="text-xs gap-1.5"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Parse
            </Button>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 flex items-start gap-2">
            <AlertTriangle className="size-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {preview && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview</p>
              <div className="flex gap-3">
                <Badge variant="secondary">
                  {preview.nodes.length} nodes
                </Badge>
                <Badge variant="secondary">
                  {preview.edges.length} edges
                </Badge>
              </div>
              {preview.warnings.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-amber-600 font-medium">
                    Warnings:
                  </p>
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-[11px] text-amber-500">
                      {w}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleImport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                >
                  Replace Canvas
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClose}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
