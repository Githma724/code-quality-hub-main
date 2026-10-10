import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFormStats, COL } from "@/hooks/useFormStats";
import {
  RefreshCw,
  Users,
  Trophy,
  Gauge,
  Clock,
  PenLine,
  Split,
  ShieldQuestion,
  Timer,
  Table2,
} from "lucide-react";

const COLORS = [
  "#8b5cf6",
  "hsl(var(--primary))",
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#ef4444",

];



type CountItem = { label: string; count: number };
type PctItem = { label: string; count: number; pct: number };

/** Recompute percentages from the counts so every table adds up to 100%. */
function withPct(items: CountItem[] | undefined, denominator?: number): PctItem[] {
  const list = items ?? [];
  const total = denominator ?? list.reduce((s, d) => s + Number(d.count || 0), 0);
  return list.map((d) => ({
    label: String(d.label),
    count: Number(d.count || 0),
    pct: total > 0 ? Math.round((Number(d.count || 0) / total) * 1000) / 10 : 0,
  }));
}

/** Put ordinal categories (experience, review time) in a sensible order. */
function orderBy(items: PctItem[], order: string[]): PctItem[] {
  const rank = (label: string) => {
    const i = order.findIndex((o) => label.toLowerCase().startsWith(o.toLowerCase()));
    return i === -1 ? order.length : i;
  };
  return [...items].sort((a, b) => rank(a.label) - rank(b.label));
}

const EXPERIENCE_ORDER = ["Less than 1", "1-2", "1–2", "1-3", "2-4", "2–4", "3-5", "4", "More than 5", "5"];
const TIME_ORDER = ["Under 1", "1–3", "1-3", "3–10", "3-10", "10+"];

type ConfidenceSummary = {
  n: number;
  mean: number;
  sd: number;
  median: number;
  mode: number;
  min: number;
  max: number;
  highPct: number;
  lowPct: number;
};

/** Mean, SD, median, mode, range and % high (4–5) from the 1–5 distribution. */
function summariseConfidence(dist: { score: number | string; count: number }[] | undefined): ConfidenceSummary | null {
  const values: number[] = [];
  (dist ?? []).forEach((d) => {
    const score = Number(d.score);
    for (let i = 0; i < Number(d.count || 0); i++) values.push(score);
  });
  const n = values.length;
  if (n === 0) return null;
  values.sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = n > 1 ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : 0;
  const median = n % 2 ? values[(n - 1) / 2] : (values[n / 2 - 1] + values[n / 2]) / 2;
  const freq = new Map<number, number>();
  values.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
  const mode = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const high = values.filter((v) => v >= 4).length;
  const low = values.filter((v) => v <= 2).length;
  return {
    n,
    mean: Math.round(mean * 100) / 100,
    sd: Math.round(sd * 100) / 100,
    median,
    mode,
    min: values[0],
    max: values[n - 1],
    highPct: Math.round((high / n) * 1000) / 10,
    lowPct: Math.round((low / n) * 1000) / 10,
  };
}

/** One block of a frequency table: variable name + its categories. */
function FrequencyBlock({ title, rows, note }: { title: string; rows: PctItem[]; note?: string }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between bg-muted/60 px-3 py-2">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">n = {total}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-3 py-1.5 text-left font-medium">Category</th>
            <th className="px-3 py-1.5 text-right font-medium">n</th>
            <th className="px-3 py-1.5 text-right font-medium">%</th>
            <th className="w-[35%] px-3 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-1.5 text-foreground">{r.label}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-foreground">{r.count}</td>
              <td className="px-3 py-1.5 text-right tabular-nums font-medium text-foreground">{r.pct}%</td>
              <td className="px-3 py-1.5">
                <div className="h-2 w-full rounded bg-muted">
                  <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(r.pct, 100)}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="px-3 py-1.5 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const labelStyle = { fontSize: 12, fill: "hsl(var(--foreground))" };


export function FormStatsDashboard() {
  const { stats, loading, error, refresh } = useFormStats();

  // ---- descriptive statistics derived from the hook's counts ----
  const N = stats?.totalResponses ?? 0;
  const experience = orderBy(withPct(stats?.countsByExperience), EXPERIENCE_ORDER);
  const language = withPct(stats?.countsByLanguage);
  const tasks = withPct(stats?.countsByTask);
  const priorAi = withPct(stats?.countsByPriorAiUse);
  const reviewTime = orderBy(withPct(stats?.timeOnTaskDistribution), TIME_ORDER);
  const chosen = withPct(stats?.countsByChosenOutput);
  const agreement = withPct(stats?.toolAgreementCounts);
  // Main reason can be multi-select, so % is out of all responses (may total > 100%).
  const reasons = withPct(stats?.countsByMainReason, N || undefined);
  // "Which tool was weighted" only applies when the tools disagreed.
  const weighted = withPct(
    (stats?.weightedToolCounts ?? []).filter((d: CountItem) => !/agreed/i.test(String(d.label))),
  );
  const conf = summariseConfidence(stats?.confidenceDistribution);
  const confDist = (stats?.confidenceDistribution ?? []).map((d: { score: number | string; count: number }) => ({
    score: String(d.score),
    count: Number(d.count || 0),
    pct: N ? Math.round((Number(d.count || 0) / N) * 1000) / 10 : 0,
  }));
  const keptExpectation =
    typeof stats?.calibrationShiftRate === "number" ? Math.round((100 - stats.calibrationShiftRate) * 10) / 10 : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">

        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Couldn't load form responses: {error}. Double-check the Sheet is
          published to the web and the CSV URL is correct.
        </div>
      )}

      {!error && stats && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Responses</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.totalResponses}</div>
                <p className="text-xs text-muted-foreground">One task per developer</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Most chosen output</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {stats.countsByChosenOutput[0]?.label ?? "—"}
                </div>
                {chosen[0] && (
                  <p className="text-xs text-muted-foreground">
                    {chosen[0].count} of {N} selections ({chosen[0].pct}%)
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg confidence</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.overallAvgConfidence} / 5</div>
                {conf && (
                  <p className="text-xs text-muted-foreground">
                    SD {conf.sd} · median {conf.median} · {conf.highPct}% rated 4–5
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Last response</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-foreground">{stats.lastResponseAt ?? "—"}</div>
              </CardContent>
            </Card>
          </div>

          {/* ================= DESCRIPTIVE STATISTICS ================= */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Table2 className="h-4 w-4" /> Descriptive statistics (N = {N})
                </CardTitle>

              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 1. Confidence summary */}
              {conf && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    1. Confidence in the chosen output (1 = not confident, 5 = very confident)
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
                    <StatTile label="n" value={conf.n} />
                    <StatTile label="Mean" value={conf.mean} hint="average rating" />
                    <StatTile label="SD" value={conf.sd} hint="spread around the mean" />
                    <StatTile label="Median" value={conf.median} hint="middle value" />
                    <StatTile label="Mode" value={conf.mode} hint="most common rating" />
                    <StatTile label="Range" value={`${conf.min}–${conf.max}`} hint="lowest to highest" />
                    <StatTile label="High (4–5)" value={`${conf.highPct}%`} />
                    <StatTile label="Low (1–2)" value={`${conf.lowPct}%`} />
                  </div>
                </div>
              )}

              {/* 2. Participant profile */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">2. Who took part</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Developer experience</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={experience}
                              dataKey="count"
                              nameKey="label"
                              outerRadius={80}
                              label={(p: any) => `${p.label} (${p.pct}%)`}
                            >
                              {experience.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Primary programming language</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={language} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                              <LabelList dataKey="count" position="top" style={labelStyle} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <FrequencyBlock title="Coding task reviewed" rows={tasks} />
                  <FrequencyBlock
                    title="Used AI coding assistants before"
                    rows={priorAi}
                    note={priorAi.length === 1 ? "No variation: this variable cannot be compared across groups." : undefined}
                  />
                </div>
              </div>

              {/* 3. Decisions and behaviour */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">3. What developers did</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Selections by chosen output</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chosen} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill={COLORS[COLORS.length - 1]} radius={[4, 4, 0, 0]}>
                              <LabelList
                                dataKey="count"
                                position="top"
                                style={labelStyle}
                                formatter={(v: number) => `${v} (${N ? Math.round((v / N) * 100) : 0}%)`}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Semgrep vs SonarCloud agreement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={agreement}
                              dataKey="count"
                              nameKey="label"
                              outerRadius={80}
                              label={(p: any) => `${p.label}: ${p.count} (${p.pct}%)`}
                            >
                              {agreement.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <FrequencyBlock
                    title="Tool weighted more (only when tools disagreed)"
                    rows={weighted}
                    note="% of the sessions where the tools disagreed."
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Timer className="h-4 w-4" /> Time spent reviewing
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reviewTime} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                              <LabelList dataKey="count" position="top" style={labelStyle} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Main reason(s) for selection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reasons} layout="vertical" margin={{ left: 24, right: 72 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                            <YAxis dataKey="label" type="category" width={180} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                              <LabelList
                                dataKey="count"
                                position="right"
                                style={labelStyle}
                                formatter={(v: number) => `${v} (${N ? Math.round((v / N) * 100) : 0}%)`}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="grid content-start gap-3 sm:grid-cols-2">
                    <StatTile
                      label="Chose the output they expected"
                      value={keptExpectation !== null ? `${keptExpectation}%` : "—"}
                      hint="final choice = pre-scan guess (chance = 33%)"
                    />
                    <StatTile
                      label="Changed from their expectation"
                      value={`${stats.calibrationShiftRate}%`}
                      hint="final choice ≠ pre-scan guess"
                    />
                    <StatTile
                      label="Edited the code"
                      value={`${stats.overallModificationRate}%`}
                      hint="modified before accepting"
                    />
                    <StatTile
                      label="Own judgement when tools disagreed"
                      value={`${stats.ownJudgmentRateWhenDisagreed}%`}
                      hint="trusted neither tool"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>





          {/* Tool agreement + weighted tool breakdown */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coding tasks reviewed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tasks} margin={{ top: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" style={labelStyle} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">When the tools disagreed, which did developers trust?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weighted} layout="vertical" margin={{ left: 24, right: 56 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]}>
                        <LabelList
                          dataKey="pct"
                          position="right"
                          style={labelStyle}
                          formatter={(v: number) => `${v}%`}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calibration by experience + modification by chosen output */}
          <div className="grid gap-4 lg:grid-cols-2">

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modification rate by chosen output</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.modificationRateByChosenOutput.map((d: { group: string; rate: number }) => ({
                        tool: d.group,
                        rate: d.rate,
                      }))}
                      margin={{ top: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="tool" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip />
                      <Bar dataKey="rate" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="rate" position="top" style={labelStyle} formatter={(v: number) => `${v}%`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          </div>



          {/* Confidence analysis */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Avg confidence by chosen output</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.avgConfidenceByChosenOutput} layout="vertical" margin={{ left: 16, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
                      <YAxis dataKey="tool" type="category" width={90} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="avgConfidence" fill="#10b981" radius={[0, 4, 4, 0]}>
                        <LabelList
                          dataKey="avgConfidence"
                          position="right"
                          style={labelStyle}
                          formatter={(v: number) => Number(v).toFixed(2)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Confidence score distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={confDist} margin={{ top: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="score" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" style={labelStyle} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main reason for selection */}




          {/* Trend over time */}
          {stats.byDate.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Responses over time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.byDate}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent responses w/ reasoning */}
          {stats.recent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most recent responses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.recent.map((r: Record<string, string>, i: number) => (
                  <div key={i} className="border-b border-border pb-3 text-sm last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{r[COL.chosenOutput] ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{r[COL.timestamp] ?? ""}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Task: {r[COL.task] ?? "—"} · Confidence: {r[COL.confidence] ?? "—"}/5
                      {" · "}Tools agreed: {r[COL.toolAgreement] ?? "—"}
                      {" · "}Modified: {r[COL.modified] ?? "—"}
                    </p>
                    {r[COL.sessionId] && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">Session: {r[COL.sessionId]}</p>
                    )}
                    {r[COL.reason] && (
                      <p className="mt-1 text-xs text-foreground/80">
                        <span className="font-medium">Why: </span>
                        {r[COL.reason]}
                      </p>
                    )}
                    {r[COL.tradeoffs] && (
                      <p className="mt-1 text-xs text-foreground/80">
                        <span className="font-medium">Tradeoffs: </span>
                        {r[COL.tradeoffs]}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}