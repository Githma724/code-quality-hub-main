import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
} from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
];

export function FormStatsDashboard() {
  const { stats, loading, error, refresh } = useFormStats();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          AI Coding Assistant Pipeline — Response Analysis
        </h2>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Responses
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {stats.totalResponses}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Most chosen output
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {stats.countsByChosenOutput[0]?.label ?? "—"}
                </div>
                {stats.countsByChosenOutput[0] && (
                  <p className="text-xs text-muted-foreground">
                    {stats.countsByChosenOutput[0].count} selections (
                    {stats.countsByChosenOutput[0].percent}%)
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg confidence
                </CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {stats.overallAvgConfidence} / 5
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Last response
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-foreground">
                  {stats.lastResponseAt ?? "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Core oversight/calibration metrics (RQ-B / RQ-C) */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Calibration shift rate
                </CardTitle>
                <Split className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {stats.calibrationShiftRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  % of responses where the final choice differed from the
                  developer's pre-scan expectation — evidence the scan
                  results are actually changing minds, not just confirming
                  priors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Own-judgment rate on disagreement
                </CardTitle>
                <ShieldQuestion className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {stats.ownJudgmentRateWhenDisagreed}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Of sessions where Semgrep and SonarCloud disagreed, % where
                  the developer trusted neither tool and used their own
                  judgment instead
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Code modification rate
                </CardTitle>
                <PenLine className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {stats.overallModificationRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  % of responses where the developer edited the code before
                  accepting it
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tool agreement + weighted tool breakdown */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Semgrep vs SonarCloud agreement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.toolAgreementCounts}
                        dataKey="count"
                        nameKey="label"
                        outerRadius={80}
                        label={(p: any) => `${p.label} (${p.percent}%)`}
                      >
                        {stats.toolAgreementCounts.map((_, i) => (
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
                <CardTitle className="text-base">
                  Which assessment did developers weight?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.weightedToolCounts}
                      layout="vertical"
                      margin={{ left: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="label"
                        type="category"
                        width={140}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
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
                <CardTitle className="text-base">
                  Calibration shift rate by experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.calibrationShiftByExperience.map((d) => ({
                        group: d.group,
                        rate: d.rate,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="group" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Modification rate by chosen output
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.modificationRateByChosenOutput.map((d) => ({
                        tool: d.group,
                        rate: d.rate,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="tool" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="rate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time on task */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Timer className="h-4 w-4" /> Time spent reviewing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.timeOnTaskDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Avg confidence by time spent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.avgConfidenceByTimeOnTask.map((d) => ({
                        bucket: d.bucket,
                        avgConfidence: d.avgConfidence,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="avgConfidence" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chosen output: bar + pie */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Selections by chosen output</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.countsByChosenOutput}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Share of selections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.countsByChosenOutput}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {stats.countsByChosenOutput.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, n: string, p: any) => [
                          `${v} (${p.payload.percent}%)`,
                          n,
                        ]}
                      />
                      <Legend />
                    </PieChart>
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
                    <BarChart
                      data={stats.avgConfidenceByChosenOutput}
                      layout="vertical"
                      margin={{ left: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
                      <YAxis dataKey="tool" type="category" width={90} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="avgConfidence" fill="#10b981" radius={[0, 4, 4, 0]} />
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
                    <BarChart data={stats.confidenceDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="score" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main reason for selection (checkbox, multi-value) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Main reason(s) for selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.countsByMainReason} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* What was compared */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tools compared per session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.countsByToolsCompared}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Demographics: task, language, experience, prior AI use */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coding tasks reviewed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.countsByTask}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
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
                    <BarChart data={stats.countsByLanguage}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Developer experience</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.countsByExperience}
                        dataKey="count"
                        nameKey="label"
                        outerRadius={80}
                        label={(p: any) => `${p.label} (${p.percent}%)`}
                      >
                        {stats.countsByExperience.map((_, i) => (
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
                <CardTitle className="text-base">Prior AI assistant use</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.countsByPriorAiUse}
                        dataKey="count"
                        nameKey="label"
                        outerRadius={80}
                        label={(p: any) => `${p.label} (${p.percent}%)`}
                      >
                        {stats.countsByPriorAiUse.map((_, i) => (
                          <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

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
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
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
                {stats.recent.map((r, i) => (
                  <div key={i} className="border-b border-border pb-3 text-sm last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        {r[COL.chosenOutput] ?? "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {r[COL.timestamp] ?? ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Task: {r[COL.task] ?? "—"} · Confidence: {r[COL.confidence] ?? "—"}/5
                      {" · "}Tools agreed: {r[COL.toolAgreement] ?? "—"}
                      {" · "}Modified: {r[COL.modified] ?? "—"}
                    </p>
                    {r[COL.sessionId] && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                        Session: {r[COL.sessionId]}
                      </p>
                    )}
                    {r[COL.reason] && (
                      <p className="text-xs text-foreground/80 mt-1">
                        <span className="font-medium">Why: </span>
                        {r[COL.reason]}
                      </p>
                    )}
                    {r[COL.tradeoffs] && (
                      <p className="text-xs text-foreground/80 mt-1">
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