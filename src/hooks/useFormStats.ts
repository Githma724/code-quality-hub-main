// src/hooks/useFormStats.ts
//
// Fetches the Google Sheet (linked to your Form's responses), published to
// the web as CSV, and turns it into stats/analysis for the dashboard.
//
// SETUP: File > Share > Publish to web > pick "Form Responses 1" > CSV > Publish.
// Paste that URL into SHEET_CSV_URL below.

import { useCallback, useEffect, useState } from "react";
import { parseCsv } from "@/lib/csv";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkDjn4O4oamE14JaVYRi9keo0wO7VTkvgOihsOuGwQZI8Dm4CCnnyR4E3PmEC3ww4pBUBA6MmjefpR/pub?output=csv";

// --- Column names (normalized: trimmed, collapsed whitespace) ---
const COL = {
  timestamp: "Timestamp",
  developer: "Developer Name",
  experience: "Years of Software Development Experience",
  language: "Primary Programming Language",
  priorAiUse: "Have you previously used AI coding assistants?",
  task: "Which coding task did you complete?",
  tool: "Which AI tool did you choose?",
  reason: "Why did you choose this output over the others?",
  tradeoffs: "What tradeoffs or weaknesses did you accept?",
  confidence: "How confident are you this is genuinely the best output?",
} as const;

function normalizeKey(key: string): string {
  return key.replace(/\s+/g, " ").trim();
}

function normalizeRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    out[normalizeKey(k)] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

interface CountEntry {
  label: string;
  count: number;
  percent: number;
}

function countBy(rows: Record<string, string>[], col: string): CountEntry[] {
  const total = rows.length;
  const counts = new Map<string, number>();
  for (const row of rows) {
    const val = row[col];
    if (!val) continue;
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface FormStats {
  totalResponses: number;

  // Tool selection
  countsByTool: CountEntry[];
  avgConfidenceByTool: { tool: string; avgConfidence: number; responses: number }[];

  // Demographics / context
  countsByExperience: CountEntry[];
  countsByLanguage: CountEntry[];
  countsByTask: CountEntry[];
  countsByPriorAiUse: CountEntry[];

  // Confidence
  overallAvgConfidence: number;
  confidenceDistribution: { score: number; count: number }[];

  // Time
  byDate: { date: string; count: number }[];
  responseRatePerDay: number;
  lastResponseAt: string | null;

  // Raw
  recent: Record<string, string>[];
  allRows: Record<string, string>[];
  columns: string[];
}

function parseSheetDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function useFormStats() {
  const [stats, setStats] = useState<FormStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${SHEET_CSV_URL}&t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);

      const text = await res.text();
      const rawRows = parseCsv(text);
      const rows = rawRows.map(normalizeRow);
      const total = rows.length;
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      // --- Tool selection counts ---
      const countsByTool = countBy(rows, COL.tool);

      // --- Avg confidence per tool ---
      const toolGroups = new Map<string, number[]>();
      for (const row of rows) {
        const tool = row[COL.tool];
        const conf = Number(row[COL.confidence]);
        if (!tool || isNaN(conf)) continue;
        if (!toolGroups.has(tool)) toolGroups.set(tool, []);
        toolGroups.get(tool)!.push(conf);
      }
      const avgConfidenceByTool = Array.from(toolGroups.entries())
        .map(([tool, scores]) => ({
          tool,
          avgConfidence:
            Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
          responses: scores.length,
        }))
        .sort((a, b) => b.avgConfidence - a.avgConfidence);

      // --- Demographics ---
      const countsByExperience = countBy(rows, COL.experience);
      const countsByLanguage = countBy(rows, COL.language);
      const countsByTask = countBy(rows, COL.task);
      const countsByPriorAiUse = countBy(rows, COL.priorAiUse);

      // --- Confidence distribution (1-5) ---
      const allConfidence = rows
        .map((r) => Number(r[COL.confidence]))
        .filter((n) => !isNaN(n));
      const overallAvgConfidence =
        allConfidence.length > 0
          ? Math.round(
              (allConfidence.reduce((a, b) => a + b, 0) / allConfidence.length) * 100
            ) / 100
          : 0;

      const distMap = new Map<number, number>();
      for (const score of allConfidence) {
        const rounded = Math.round(score);
        distMap.set(rounded, (distMap.get(rounded) ?? 0) + 1);
      }
      const confidenceDistribution = [1, 2, 3, 4, 5].map((score) => ({
        score,
        count: distMap.get(score) ?? 0,
      }));

      // --- Responses over time ---
      const dateCounts = new Map<string, number>();
      let latestDate: Date | null = null;

      for (const row of rows) {
        const d = parseSheetDate(row[COL.timestamp]);
        if (!d) continue;
        const key = d.toISOString().slice(0, 10);
        dateCounts.set(key, (dateCounts.get(key) ?? 0) + 1);
        if (!latestDate || d > latestDate) latestDate = d;
      }

      const byDate = Array.from(dateCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const spanDays =
        byDate.length > 0
          ? Math.max(
              1,
              Math.round(
                (new Date(byDate[byDate.length - 1].date).getTime() -
                  new Date(byDate[0].date).getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1
            )
          : 1;

      setStats({
        totalResponses: total,
        countsByTool,
        avgConfidenceByTool,
        countsByExperience,
        countsByLanguage,
        countsByTask,
        countsByPriorAiUse,
        overallAvgConfidence,
        confidenceDistribution,
        byDate,
        responseRatePerDay: Math.round((total / spanDays) * 10) / 10,
        lastResponseAt: latestDate ? latestDate.toLocaleString() : null,
        recent: rows.slice(-5).reverse(),
        allRows: rows,
        columns,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000);
    return () => clearInterval(intervalId);
  }, [load]);

  return { stats, loading, error, refresh: load };
}

export { COL };