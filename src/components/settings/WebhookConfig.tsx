"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Webhook,
  Plus,
  Trash2,
  Loader2,
  Copy,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useWorkflowStore } from "@/lib/store/workflow-store";

interface WebhookRecord {
  id: string;
  workflowId: string;
  path: string;
  secret: string;
  active: boolean;
}

const WEBHOOK_BASE_URL =
  process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL ?? "http://localhost:3000";

function generatePath(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "wh-";
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function WebhookConfig() {
  const workflowId = useWorkflowStore((s) => s.id);

  const [open, setOpen] = useState(false);
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formPath, setFormPath] = useState(() => generatePath());
  const [formActive, setFormActive] = useState(true);

  const fetchWebhooks = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/webhook-endpoints?workflowId=${encodeURIComponent(workflowId)}`,
      );
      const data = await res.json();
      setWebhooks(data.webhooks ?? []);
    } catch {
      /* network error */
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (open) fetchWebhooks();
  }, [open, fetchWebhooks]);

  async function handleCreate() {
    if (!workflowId || !formPath.trim()) return;
    const res = await fetch("/api/webhook-endpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowId,
        path: formPath,
        active: formActive,
      }),
    });
    if (!res.ok) return;
    setShowForm(false);
    setFormPath(generatePath());
    setFormActive(true);
    fetchWebhooks();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/webhook-endpoints/${id}`, { method: "DELETE" });
    fetchWebhooks();
  }

  async function handleToggleActive(wh: WebhookRecord) {
    await fetch(`/api/webhook-endpoints/${wh.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !wh.active }),
    });
    fetchWebhooks();
  }

  function copyUrl(wh: WebhookRecord) {
    const url = `${WEBHOOK_BASE_URL}/api/webhooks/${wh.path}`;
    navigator.clipboard.writeText(url);
    setCopiedId(wh.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Webhook className="size-3.5" />
            Webhooks
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="size-4" />
            Webhook Endpoints
          </DialogTitle>
        </DialogHeader>

        {!workflowId && (
          <p className="py-4 text-center text-sm text-zinc-400">
            Save the workflow first to manage webhooks.
          </p>
        )}

        {workflowId && (
          <>
            <ScrollArea className="max-h-96">
              <div className="space-y-3 py-2">
                {loading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-zinc-400" />
                  </div>
                )}
                {!loading && webhooks.length === 0 && !showForm && (
                  <p className="py-4 text-center text-sm text-zinc-400">
                    No webhook endpoints configured.
                  </p>
                )}
                {webhooks.map((wh) => (
                  <div
                    key={wh.id}
                    className="space-y-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={wh.active ? "default" : "outline"}
                            className="text-[10px]"
                          >
                            {wh.active ? "active" : "inactive"}
                          </Badge>
                          <span className="truncate font-mono text-xs text-zinc-500">
                            /{wh.path}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Switch
                          checked={wh.active}
                          onCheckedChange={() => handleToggleActive(wh)}
                          className="scale-75"
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(wh.id)}
                          className="text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        readOnly
                        value={`${WEBHOOK_BASE_URL}/api/webhooks/${wh.path}`}
                        className="h-7 flex-1 font-mono text-[11px] text-zinc-400"
                      />
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => copyUrl(wh)}
                        className="shrink-0"
                      >
                        {copiedId === wh.id ? (
                          <CheckCheck className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                {showForm && (
                  <>
                    <Separator />
                    <div className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Endpoint Path</Label>
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 text-xs text-zinc-400">
                            /api/webhooks/
                          </span>
                          <Input
                            value={formPath}
                            onChange={(e) => setFormPath(e.target.value)}
                            placeholder="wh-abc123"
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          Full URL: {WEBHOOK_BASE_URL}/api/webhooks/{formPath}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formActive}
                          onCheckedChange={setFormActive}
                        />
                        <Label className="text-xs">Active immediately</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleCreate}
                          className="bg-emerald-600 text-xs hover:bg-emerald-700"
                        >
                          Create
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowForm(false)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
            {!showForm && (
              <Button
                onClick={() => {
                  setFormPath(generatePath());
                  setShowForm(true);
                }}
                className="mt-2 gap-1.5 text-xs"
                variant="outline"
              >
                <Plus className="size-3.5" /> Add Webhook
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
