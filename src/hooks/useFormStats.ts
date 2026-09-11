import { useCallback, useEffect, useState } from "react";
import { parseCsv } from "@/lib/csv";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vROUfyZdgaKVYhRdTNajvfyml5naikzVkiWfGRwMO33eDiXvVWtECA99k3g-BeRj4H8qacx56q5FMxP/pub?output=csv";

// Column names must match the redesigned form's exact question text
// (Google Forms uses the question text as the linked Sheet's header row).
const COL = {
  timestamp: "Timestamp",
  sessionId: "Session / Dispatch ID",
  participantId: "Participant Name",
  experience: "Years of Software Development Experience",
  language: "Primary Programming Language",
  priorAiUse: "Have you previously used AI coding assistants?",
  task: "Which coding task did you review?",
  toolsCompared: "Which AI tools' outputs did you compare in this session?",
  preScanExpectation:
    "Before looking at the Semgrep/SonarCloud results, which output did you expect to be safest?",
  timeOnTask: "How long did you spend reviewing the outputs and results before deciding?",
  toolAgreement:
    "Did Semgrep and SonarCloud flag the same output as having the fewest issues?",
  weightedTool: "If they disagreed, which assessment did you weight more heavily?",
  chosenOutput: "Which output did you choose?",
  modified: "Did you modify the code before accepting it?",
  mainReason: "Main reason for selection",
  reason: "Why did you choose this output over the others?",
  tradeoffs: "What tradeoffs or weaknesses did you accept?",
  confidence: "How confident are you that this is genuinely the best output?",
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

function countByMulti(rows: Record<string, string>[], col: string): CountEntry[] {
  const counts = new Map<string, number>();
  let totalSelections = 0;
  for (const row of rows) {
    const val = row[col];
    if (!val) continue;
    const parts = val.split(",").map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      counts.set(p, (counts.get(p) ?? 0) + 1);
      totalSelections++;
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      count,
      percent: totalSelections > 0 ? Math.round((count / totalSelections) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function rateOf(
  rows: Record<string, string>[],
  predicate: (row: Record<string, string>) => boolean
): { rate: number; positive: number; total: number } {
  let positive = 0;
  let total = 0;
  for (const row of rows) {
    total++;
    if (predicate(row)) positive++;
  }
  return { rate: total > 0 ? Math.round((positive / total) * 1000) / 10 : 0, positive, total };
}

function rateByGroup(
  rows: Record<string, string>[],
  groupCol: string,
  predicate: (row: Record<string, string>) => boolean
): { group: string; rate: number; total: number }[] {
  const groups = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    const g = row[groupCol];
    if (!g) continue;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(row);
  }
  return Array.from(groups.entries())
    .map(([group, groupRows]) => {
      const { rate, total } = rateOf(groupRows, predicate);
      return { group, rate, total };
    })
    .sort((a, b) => b.rate - a.rate);
}

export interface FormStats {
  totalResponses: number;

  countsByChosenOutput: CountEntry[];
  avgConfidenceByChosenOutput: { tool: string; avgConfidence: number; responses: number }[];

  countsByToolsCompared: CountEntry[];

  countsByExperience: CountEntry[];
  countsByLanguage: CountEntry[];
  countsByTask: CountEntry[];
  countsByPriorAiUse: CountEntry[];

  countsByMainReason: CountEntry[];

  overallAvgConfidence: number;
  confidenceDistribution: { score: number; count: number }[];

  // Calibration (RQ-C): did final choice match pre-scan expectation?
  calibrationShiftRate: number; // % where chosenOutput != preScanExpectation
  calibrationShiftByExperience: { group: string; rate: number; total: number }[];

  // Tool agreement + weighting (RQ-B)
  toolAgreementCounts: CountEntry[]; // agreed / disagreed / only one tool
  weightedToolCounts: CountEntry[]; // Semgrep / SonarCloud / own judgment / N/A
  ownJudgmentRateWhenDisagreed: number;

  timeOnTaskDistribution: CountEntry[];
  avgConfidenceByTimeOnTask: { bucket: string; avgConfidence: number; responses: number }[];

  overallModificationRate: number;
  modificationRateByChosenOutput: { group: string; rate: number; total: number }[];

  byDate: { date: string; count: number }[];
  responseRatePerDay: number;
  lastResponseAt: string | null;

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

      const countsByChosenOutput = countBy(rows, COL.chosenOutput);

      const toolGroups = new Map<string, number[]>();
      for (const row of rows) {
        const tool = row[COL.chosenOutput];
        const conf = Number(row[COL.confidence]);
        if (!tool || isNaN(conf)) continue;
        if (!toolGroups.has(tool)) toolGroups.set(tool, []);
        toolGroups.get(tool)!.push(conf);
      }
      const avgConfidenceByChosenOutput = Array.from(toolGroups.entries())
        .map(([tool, scores]) => ({
          tool,
          avgConfidence:
            Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
          responses: scores.length,
        }))
        .sort((a, b) => b.avgConfidence - a.avgConfidence);

      const countsByToolsCompared = countByMulti(rows, COL.toolsCompared);

      const countsByExperience = countBy(rows, COL.experience);
      const countsByLanguage = countBy(rows, COL.language);
      const countsByTask = countBy(rows, COL.task);
      const countsByPriorAiUse = countBy(rows, COL.priorAiUse);

      const countsByMainReason = countByMulti(rows, COL.mainReason);

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

      // Calibration shift: pre-scan expectation vs final choice
      const calibrationRows = rows.filter(
        (r) => r[COL.preScanExpectation] && r[COL.chosenOutput]
      );
      const calibrationShift = rateOf(
        calibrationRows,
        (r) => r[COL.preScanExpectation] !== r[COL.chosenOutput]
      );
      const calibrationShiftRate = calibrationShift.rate;
      const calibrationShiftByExperience = rateByGroup(
        calibrationRows,
        COL.experience,
        (r) => r[COL.preScanExpectation] !== r[COL.chosenOutput]
      );

      // Tool agreement + weighting
      const toolAgreementCounts = countBy(rows, COL.toolAgreement);
      const weightedToolCounts = countBy(rows, COL.weightedTool);

      const disagreedRows = rows.filter((r) =>
        (r[COL.toolAgreement] ?? "").toLowerCase().startsWith("no")
      );
      const ownJudgmentRateWhenDisagreed = rateOf(
        disagreedRows,
        (r) => (r[COL.weightedTool] ?? "").toLowerCase().includes("own judgment")
      ).rate;

      // Time on task
      const timeOnTaskDistribution = countBy(rows, COL.timeOnTask);

      const timeGroups = new Map<string, number[]>();
      for (const row of rows) {
        const bucket = row[COL.timeOnTask];
        const conf = Number(row[COL.confidence]);
        if (!bucket || isNaN(conf)) continue;
        if (!timeGroups.has(bucket)) timeGroups.set(bucket, []);
        timeGroups.get(bucket)!.push(conf);
      }
      const avgConfidenceByTimeOnTask = Array.from(timeGroups.entries())
        .map(([bucket, scores]) => ({
          bucket,
          avgConfidence:
            Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
          responses: scores.length,
        }))
        .sort((a, b) => b.avgConfidence - a.avgConfidence);

      const overallModificationRate = rateOf(
        rows,
        (r) => r[COL.modified] === "Yes"
      ).rate;
      const modificationRateByChosenOutput = rateByGroup(
        rows,
        COL.chosenOutput,
        (r) => r[COL.modified] === "Yes"
      );

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
        countsByChosenOutput,
        avgConfidenceByChosenOutput,
        countsByToolsCompared,
        countsByExperience,
        countsByLanguage,
        countsByTask,
        countsByPriorAiUse,
        countsByMainReason,
        overallAvgConfidence,
        confidenceDistribution,
        calibrationShiftRate,
        calibrationShiftByExperience,
        toolAgreementCounts,
        weightedToolCounts,
        ownJudgmentRateWhenDisagreed,
        timeOnTaskDistribution,
        avgConfidenceByTimeOnTask,
        overallModificationRate,
        modificationRateByChosenOutput,
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