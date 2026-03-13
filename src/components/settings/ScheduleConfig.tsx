"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, Trash2, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkflowStore } from "@/lib/store/workflow-store";

interface ScheduleRecord {
  id: string;
  workflowId: string;
  cronExpression: string;
  timezone: string;
  active: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
}

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
] as const;

function formatNextRun(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs < 0) return "overdue";

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `in ${days}d ${hours % 24}h`;
}

export function ScheduleConfig() {
  const workflowId = useWorkflowStore((s) => s.id);

  const [open, setOpen] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formCron, setFormCron] = useState("0 * * * *");
  const [formTimezone, setFormTimezone] = useState("UTC");
  const [formActive, setFormActive] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/schedules?workflowId=${encodeURIComponent(workflowId)}`,
      );
      const data = await res.json();
      setSchedules(data.schedules ?? []);
    } catch {
      /* network error */
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (open) fetchSchedules();
  }, [open, fetchSchedules]);

  async function handleCreate() {
    if (!workflowId || !formCron.trim()) return;
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowId,
        cronExpression: formCron,
        timezone: formTimezone,
        active: formActive,
      }),
    });
    if (!res.ok) return;
    setShowForm(false);
    setFormCron("0 * * * *");
    setFormTimezone("UTC");
    setFormActive(true);
    fetchSchedules();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    fetchSchedules();
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
            <Clock className="size-3.5" />
            Schedules
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            Schedule Manager
          </DialogTitle>
        </DialogHeader>

        {!workflowId && (
          <p className="py-4 text-center text-sm text-zinc-400">
            Save the workflow first to manage schedules.
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
                {!loading && schedules.length === 0 && !showForm && (
                  <p className="py-4 text-center text-sm text-zinc-400">
                    No schedules configured.
                  </p>
                )}
                {schedules.map((sched) => (
                  <div
                    key={sched.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium">
                        {sched.cronExpression}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {sched.timezone}
                        </Badge>
                        <Badge
                          variant={sched.active ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {sched.active ? "active" : "paused"}
                        </Badge>
                        {sched.nextRunAt && (
                          <span className="text-[10px] text-zinc-400">
                            Next: {formatNextRun(sched.nextRunAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(sched.id)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}

                {showForm && (
                  <>
                    <Separator />
                    <div className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cron Expression</Label>
                        <Input
                          value={formCron}
                          onChange={(e) => setFormCron(e.target.value)}
                          placeholder="0 * * * *"
                          className="font-mono text-sm"
                        />
                        <p className="text-[10px] text-zinc-400">
                          min hour day month weekday (e.g. &quot;0 9 * * 1-5&quot; =
                          weekdays at 9am)
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Timezone</Label>
                        <Select
                          value={formTimezone}
                          onValueChange={(v) => setFormTimezone(v ?? "UTC")}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONES.map((tz) => (
                              <SelectItem key={tz} value={tz}>
                                {tz}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          Save
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
                onClick={() => setShowForm(true)}
                className="mt-2 gap-1.5 text-xs"
                variant="outline"
              >
                <Plus className="size-3.5" /> Add Schedule
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
