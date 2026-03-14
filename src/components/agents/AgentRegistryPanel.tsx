"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, Plus, Trash2, Loader2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface AgentRecord {
  id: string;
  name: string;
  fingerprint: string;
  modelProvider: string;
  modelVersion: string;
  creatorName: string;
  creatorVerified: boolean;
  status: string;
  issuedAt: string;
  revokedAt: string | null;
  mandateCount: number;
  auditCount: number;
}

export function AgentRegistryPanel() {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formModelProvider, setFormModelProvider] = useState("openai");
  const [formModelVersion, setFormModelVersion] = useState("");
  const [formCreatorName, setFormCreatorName] = useState("");

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchAgents();
  }, [open, fetchAgents]);

  async function handleRegister() {
    if (!formName.trim() || !formCreatorName.trim()) return;
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName.trim(),
        modelProvider: formModelProvider,
        modelVersion: formModelVersion || undefined,
        creatorName: formCreatorName.trim(),
      }),
    });
    setShowForm(false);
    setFormName("");
    setFormModelVersion("");
    setFormCreatorName("");
    fetchAgents();
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/agents/${id}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Revoked from registry" }),
    });
    fetchAgents();
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
            <Bot className="size-3.5" />
            Agents
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-4" />
            Agent Registry (KYA)
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[28rem]">
          <div className="space-y-3 py-2">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-zinc-400" />
              </div>
            )}
            {!loading && agents.length === 0 && !showForm && (
              <p className="py-4 text-center text-sm text-zinc-400">
                No agents registered. Register an agent to use KYA workflows.
              </p>
            )}
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium">{agent.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        agent.status === "active"
                          ? "default"
                          : agent.status === "revoked"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {agent.status}
                    </Badge>
                    <span className="text-[10px] text-zinc-400">
                      {agent.modelProvider} · {agent.mandateCount} mandates
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-zinc-500 font-mono">
                    {agent.fingerprint.slice(0, 16)}…
                  </p>
                </div>
                {agent.status === "active" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRevoke(agent.id)}
                    className="text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
            {showForm && (
              <div className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <Label className="text-xs">Register new agent</Label>
                <div className="grid gap-2">
                  <Input
                    placeholder="Agent name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <select
                      value={formModelProvider}
                      onChange={(e) => setFormModelProvider(e.target.value)}
                      className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google</option>
                    </select>
                    <Input
                      placeholder="Model version (optional)"
                      value={formModelVersion}
                      onChange={(e) => setFormModelVersion(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <Input
                    placeholder="Creator name"
                    value={formCreatorName}
                    onChange={(e) => setFormCreatorName(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleRegister} className="bg-emerald-600 text-xs hover:bg-emerald-700">
                    Register
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
            )}
          </div>
        </ScrollArea>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="mt-2 gap-1.5 text-xs"
            variant="outline"
          >
            <Plus className="size-3.5" /> Register Agent
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
