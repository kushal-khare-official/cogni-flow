"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Compass, Sparkles, Loader2, MapPin } from "lucide-react"

const SUGGESTIONS = [
  "Vizag to Manali, 3-star hotel for 3 days, flight journey",
  "Mumbai to Goa, cab + hotel for 2 days",
  "Delhi to Shimla, train + hotel + sightseeing cabs for 4 days",
]

interface TripPromptFormProps {
  loading: boolean
  onGenerate: (input: { prompt: string }) => Promise<void>
}

export function TripPromptForm({ loading, onGenerate }: TripPromptFormProps) {
  const [prompt, setPrompt] = useState(
    "book itinerary travelling from vizag to manali want flight journey, 3 star hotel for 3 days",
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed) return
    await onGenerate({ prompt: trimmed })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* ── Gradient banner header ── */}
      <div
        className="flex items-center gap-4 px-6 py-5"
        style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}
      >
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <Compass className="size-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-extrabold tracking-tight text-white">
            AI Travel Planner
          </h2>
          <p className="text-xs text-blue-100 mt-0.5">
            Describe your trip · AI returns only supported integrations
          </p>
        </div>
        <Sparkles className="size-5 text-white/60" />
      </div>

      {/* ── Input area ── */}
      <div className="p-5">
        <div className="relative">
          <MapPin
            className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground"
          />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. book itinerary from Vizag to Manali, flight + 3-star hotel for 3 days..."
            disabled={loading}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>

        {/* Suggestion chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              disabled={loading}
              className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Submit */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Powered by Anthropic Claude
          </p>
          <Button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="gap-2 px-6 font-semibold"
            style={{
              background: loading
                ? "#94a3b8"
                : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
              border: "none",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate Plan
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
