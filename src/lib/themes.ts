import type { Theme } from './types'

export const THEMES: { id: Theme; label: string; desc: string; color: string | null }[] = [
  { id: 'minimal', label: 'Minimal', desc: 'Clean ring, follows light/dark', color: null },
  { id: 'misbaha', label: 'Misbaha', desc: 'A string of prayer beads', color: '#f3ebdc' },
  { id: 'geometric', label: 'Geometric', desc: 'Eight-pointed star in gold', color: '#0f3b33' },
  { id: 'night', label: 'Night sky', desc: 'Light a constellation', color: '#0b1024' },
  { id: 'water', label: 'Still water', desc: 'Ripples and a rising tide', color: '#f4f1ea' },
  { id: 'ink', label: 'Ink', desc: 'Calligraphy fills with ink', color: '#f7f2e7' },
]

/** Arabic-Indic digits, e.g. 33 -> ٣٣ */
export const arabicDigits = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

/** Deterministic pseudo-random sequence so decorative layouts don't jump between renders. */
export function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
