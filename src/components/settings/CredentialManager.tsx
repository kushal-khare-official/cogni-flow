"use client";

import { useState, useEffect, useCallback } from "react";
import { KeyRound, Plus, Trash2, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CredentialRecord {
  id: string;
  name: string;
  type: string;
  metadata: Record<string, string>;
  createdAt: string;
}

export function CredentialManager() {
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("apiKey");
  const [formValues, setFormValues] = useState<Record<string, string>>({
    apiKey: "",
  });

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/credentials");
      const data = await res.json();
      setCredentials(data.credentials ?? []);
    } catch {
      /* network error – silently ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchCredentials();
  }, [open, fetchCredentials]);

  async function handleCreate() {
    if (!formName.trim()) return;
    await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        type: formType,
        values: formValues,
      }),
    });
    setShowForm(false);
    setFormName("");
    setFormValues({ apiKey: "" });
    fetchCredentials();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/credentials/${id}`, { method: "DELETE" });
    fetchCredentials();
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
            <KeyRound className="size-3.5" />
            Credentials
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Credential Manager
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          <div className="space-y-3 py-2">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-zinc-400" />
              </div>
            )}
            {!loading && credentials.length === 0 && !showForm && (
              <p className="py-4 text-center text-sm text-zinc-400">
                No credentials yet.
              </p>
            )}
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium">{cred.name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {cred.type}
                    </Badge>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(cred.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {Object.keys(cred.metadata).length > 0 && (
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {Object.keys(cred.metadata).join(", ")}: ••••
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(cred.id)}
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
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Stripe Production"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select value={formType} onValueChange={(v) => setFormType(v ?? "apiKey")}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apiKey">API Key</SelectItem>
                        <SelectItem value="bearerToken">
                          Bearer Token
                        </SelectItem>
                        <SelectItem value="basicAuth">Basic Auth</SelectItem>
                        <SelectItem value="oauth2">OAuth2</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Value (key-value pairs)</Label>
                    {Object.entries(formValues).map(([key, val]) => (
                      <div key={key} className="flex gap-2">
                        <Input
                          value={key}
                          onChange={(e) => {
                            const newVals = { ...formValues };
                            delete newVals[key];
                            newVals[e.target.value] = val;
                            setFormValues(newVals);
                          }}
                          placeholder="key"
                          className="flex-1 text-xs"
                        />
                        <Input
                          type="password"
                          value={val}
                          onChange={(e) =>
                            setFormValues({
                              ...formValues,
                              [key]: e.target.value,
                            })
                          }
                          placeholder="value"
                          className="flex-1 text-xs"
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormValues({
                          ...formValues,
                          [`field${Object.keys(formValues).length}`]: "",
                        })
                      }
                      className="text-xs"
                    >
                      + Add field
                    </Button>
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
            <Plus className="size-3.5" /> Add Credential
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
