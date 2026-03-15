"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Globe, Sparkles, Loader2, MapPinned } from "lucide-react"

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
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-travel-primary px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Globe className="size-5 text-travel-primary-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="font-display text-base font-extrabold tracking-tight text-travel-primary-foreground">
              AI Travel Planner
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs text-travel-primary-foreground/70">
              Describe your trip · AI returns only supported integrations
            </CardDescription>
          </div>
          <Sparkles className="size-5 text-travel-primary-foreground/40" />
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <MapPinned className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. book itinerary from Vizag to Manali, flight + 3-star hotel for 3 days..."
              disabled={loading}
              rows={3}
              className="resize-none pl-10"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="cursor-pointer transition-colors hover:border-travel-primary/40 hover:bg-travel-primary-muted hover:text-travel-primary"
                onClick={() => !loading && setPrompt(s)}
              >
                {s}
              </Badge>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Powered by Anthropic Claude
            </p>
            <Button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="gap-2 bg-travel-primary px-6 font-semibold text-travel-primary-foreground hover:bg-travel-primary/90"
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
        </form>
      </CardContent>
    </Card>
  )
}
