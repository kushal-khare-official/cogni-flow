import type { TravelIntegrationType } from "@/lib/travel/types"
import { Plane, Hotel, Car, Bus, TrainFront } from "lucide-react"

export interface TypeColorTokens {
  accent: string
  light: string
  border: string
  text: string
  bg: string
  bgHover: string
}

export const TYPE_COLOR: Record<TravelIntegrationType, TypeColorTokens> = {
  flight: {
    accent: "text-blue-500",
    light: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    bg: "bg-blue-500",
    bgHover: "hover:bg-blue-100",
  },
  hotel: {
    accent: "text-violet-500",
    light: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    bg: "bg-violet-500",
    bgHover: "hover:bg-violet-100",
  },
  cab: {
    accent: "text-amber-500",
    light: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    bg: "bg-amber-500",
    bgHover: "hover:bg-amber-100",
  },
  bus: {
    accent: "text-emerald-500",
    light: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    bg: "bg-emerald-500",
    bgHover: "hover:bg-emerald-100",
  },
  train: {
    accent: "text-cyan-500",
    light: "bg-cyan-50",
    border: "border-cyan-200",
    text: "text-cyan-700",
    bg: "bg-cyan-500",
    bgHover: "hover:bg-cyan-100",
  },
  selfDriving: {
    accent: "text-orange-500",
    light: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    bg: "bg-orange-500",
    bgHover: "hover:bg-orange-100",
  },
}

export const TYPE_ICON: Record<TravelIntegrationType, React.ElementType> = {
  flight: Plane,
  hotel: Hotel,
  cab: Car,
  bus: Bus,
  train: TrainFront,
  selfDriving: Car,
}

export const TYPE_LABEL: Record<TravelIntegrationType, string> = {
  flight: "Flight",
  hotel: "Hotel",
  cab: "Cab",
  bus: "Bus",
  train: "Train",
  selfDriving: "Self Drive",
}

export const ESTIMATED_RANGES: Record<TravelIntegrationType, { min: number; max: number }> = {
  flight: { min: 4500, max: 12000 },
  hotel: { min: 2000, max: 7500 },
  cab: { min: 350, max: 1800 },
  bus: { min: 600, max: 2200 },
  train: { min: 800, max: 3500 },
  selfDriving: { min: 1500, max: 4500 },
}

export function midPrice(type: TravelIntegrationType) {
  const r = ESTIMATED_RANGES[type]
  return Math.floor((r.min + r.max) / 2)
}

export function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}
