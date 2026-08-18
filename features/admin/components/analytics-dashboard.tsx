import {
  ActivityIcon,
  Building2Icon,
  CalendarClockIcon,
  ChartColumnIcon,
  ClockIcon,
  FileCheck2Icon,
  GaugeIcon,
  HourglassIcon,
  LayersIcon,
  ListChecksIcon,
  MapPinIcon,
  PercentIcon,
  ShieldAlertIcon,
  TargetIcon,
  TrendingUpIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";

import {
  HubComparison,
  IntegrityComparison,
  ItemAnalysis,
  OutcomeFunnel,
  RegionComparison,
  TopPerformers,
} from "@/features/admin/components/analytics-panels";
import {
  DurationSpread,
  HourlyActivity,
  ScoreSpread,
  SubmissionsTrend,
  TimeVersusScore,
  WeekdayActivity,
} from "@/features/admin/components/analytics-charts";
import { ChartCard } from "@/features/admin/components/chart-card";
import {
  DataTable,
  Legend,
  Panel,
  StatGrid,
  StatTile,
  SURFACE,
  TINT,
  VIZ,
  formatDuration,
  formatNumber,
  formatPercent,
} from "@/features/admin/components/dashboard-primitives";
import { RefreshButton } from "@/features/admin/components/refresh-button";
import type { Analytics } from "@/features/admin/data/get-admin-analytics";

const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function SectionHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-0.5">
      <h2 className="text-sm font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * The whole analytics read-out, given the payload. Kept apart from the route so
 * the page stays a thin fetch-and-guard and this stays renderable from anything
 * holding an Analytics object.
 */
export function AnalyticsDashboard({ analytics }: { analytics: Analytics }) {
  const { summary } = analytics;
  const passing = analytics.passingPercentage;
  const completion =
    summary.created === 0
      ? null
      : Math.round((summary.submitted / summary.created) * 100);
  const trendTotal = analytics.trend.reduce((sum, day) => sum + day.submitted, 0);
  const busiestDay = analytics.trend.reduce<Analytics["trend"][number] | null>(
    (best, day) => (best === null || day.submitted > best.submitted ? day : best),
    null,
  );
  const peakHour = analytics.hourly.reduce(
    (best, hour) => (hour.submitted > best.submitted ? hour : best),
    analytics.hourly[0] ?? { hour: 0, submitted: 0 },
  );
  const peakWeekday = analytics.weekday.reduce(
    (best, day) => (day.submitted > best.submitted ? day : best),
    analytics.weekday[0] ?? { averageScore: null, submitted: 0, weekday: 1 },
  );
  const generatedAt = new Date(analytics.generatedAt).toLocaleString("en-IN", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
  const weakItems = analytics.itemAnalysis.filter(
    (item) => item.discriminationIndex !== null && item.discriminationIndex < 20,
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <section
        className={`${SURFACE} overflow-hidden bg-gradient-to-br from-blue-50/70 via-background to-background`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
              style={{ backgroundColor: TINT.blue.bg, color: TINT.blue.fg }}
            >
              <ChartColumnIcon aria-hidden="true" className="size-3.5" />
              Assessment analytics
            </span>
            <h1 className="mt-3 text-lg font-semibold tracking-[-0.01em] text-foreground">
              How the assessment is performing
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Cohort outcomes, question quality, timing and integrity across
              every submitted attempt. Expand any chart for the full-size view
              and the numbers behind it.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/85 tabular-nums">
              Pass mark {formatPercent(passing)} · {summary.submitted} submitted
              attempts · updated {generatedAt}
            </p>
          </div>
          <RefreshButton />
        </div>
      </section>

      <SectionHeading
        title="Headline numbers"
        description="The cohort at a glance"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          hint={`${summary.inProgress} still in progress`}
          icon={FileCheck2Icon}
          label="Submitted"
          value={summary.submitted.toString()}
        />
        <StatTile
          hint={`of ${summary.created} attempts created`}
          icon={PercentIcon}
          label="Completion"
          meter={completion}
          tint={TINT.teal}
          value={completion === null ? "—" : `${completion}%`}
        />
        <StatTile
          hint={`${summary.qualified} qualified · ${summary.notQualified} did not`}
          icon={TargetIcon}
          label="Pass rate"
          meter={summary.passRate}
          tint={TINT.green}
          value={formatPercent(summary.passRate)}
        />
        <StatTile
          hint={`mean ${formatPercent(summary.averageScore, 1)} · spread ±${formatNumber(summary.scoreStdDev)}`}
          icon={GaugeIcon}
          label="Median score"
          tint={TINT.violet}
          value={formatPercent(summary.medianScore)}
        />
        <StatTile
          hint={`average ${formatDuration(summary.averageDurationSeconds)}`}
          icon={ClockIcon}
          label="Median time"
          tint={TINT.slate}
          value={formatDuration(summary.medianDurationSeconds)}
        />
        <StatTile
          hint={`${summary.totalWarnings} tab switches recorded`}
          icon={ShieldAlertIcon}
          label="Flagged attempts"
          tint={TINT.amber}
          value={summary.attemptsWithWarnings.toString()}
        />

        <StatTile
          hint={`${summary.notStarted} have not started`}
          icon={UsersIcon}
          label="Candidates"
          value={summary.candidates.toString()}
        />
        <StatTile
          hint={`${summary.submittedLast7Days} in the last 7 days`}
          icon={CalendarClockIcon}
          label="Submitted today"
          tint={TINT.teal}
          value={summary.submittedToday.toString()}
        />
        <StatTile
          hint={`of ${summary.hubsTotal} skill centres`}
          icon={Building2Icon}
          label="Centres active"
          meter={
            summary.hubsTotal === 0
              ? null
              : (summary.hubsCovered / summary.hubsTotal) * 100
          }
          tint={TINT.violet}
          value={`${summary.hubsCovered}/${summary.hubsTotal}`}
        />
        <StatTile
          hint={`of ${summary.regionsTotal} states`}
          icon={MapPinIcon}
          label="States active"
          meter={
            summary.regionsTotal === 0
              ? null
              : (summary.regionsCovered / summary.regionsTotal) * 100
          }
          tint={TINT.rose}
          value={`${summary.regionsCovered}/${summary.regionsTotal}`}
        />
      </div>

      <SectionHeading
        title="Cohort outcomes"
        description="Where trainers land and where they fall away"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          description={`${summary.submitted} submitted attempts by ten-point band, qualified shaded green`}
          expandedDescription="Every ten-point band, with the qualified split, the middle-half box and the pass mark drawn in."
          icon={<ChartColumnIcon aria-hidden="true" className="size-4" />}
          title="Score spread"
          footer={
            <Legend
              items={[
                { color: VIZ.good, label: "Qualified" },
                { color: VIZ.series, label: "Not qualified" },
                { color: VIZ.critical, label: `Pass mark ${formatPercent(passing)}` },
              ]}
            />
          }
          expanded={
            <ScoreSpread
              distribution={analytics.scoreDistribution}
              median={summary.medianScore}
              p25={summary.p25Score}
              p75={summary.p75Score}
              passing={passing}
              size="full"
            />
          }
          detail={
            <>
              <StatGrid
                items={[
                  { label: "Lowest", value: formatPercent(summary.minScore, 1) },
                  { label: "25th percentile", value: formatPercent(summary.p25Score, 1) },
                  { label: "Median", value: formatPercent(summary.medianScore, 1) },
                  { label: "75th percentile", value: formatPercent(summary.p75Score, 1) },
                  { label: "Highest", value: formatPercent(summary.maxScore, 1) },
                  { label: "Mean", value: formatPercent(summary.averageScore, 1) },
                  { label: "Standard deviation", value: formatNumber(summary.scoreStdDev) },
                  {
                    hint: "scored full marks",
                    label: "Perfect scores",
                    value: summary.perfectScores.toString(),
                  },
                ]}
              />
              <DataTable
                columns={[
                  { key: "band", label: "Score band" },
                  { align: "right", key: "count", label: "Attempts" },
                  { align: "right", key: "qualified", label: "Qualified" },
                  { align: "right", key: "notQualified", label: "Not qualified" },
                  { align: "right", key: "share", label: "Share of cohort" },
                ]}
                rows={analytics.scoreDistribution.map((bucket) => ({
                  cells: {
                    band: `${bucket.rangeStart}–${bucket.rangeEnd}%`,
                    count: bucket.count,
                    notQualified: bucket.notQualified,
                    qualified: bucket.qualified,
                    share:
                      summary.submitted === 0
                        ? "—"
                        : `${Math.round((bucket.count / summary.submitted) * 100)}%`,
                  },
                  key: `band-${bucket.rangeStart}`,
                }))}
              />
            </>
          }
        >
          <ScoreSpread
            distribution={analytics.scoreDistribution}
            median={summary.medianScore}
            p25={summary.p25Score}
            p75={summary.p75Score}
            passing={passing}
          />
        </ChartCard>

        <ChartCard
          description="Every attempt, from login to a qualifying score"
          expandedDescription="The same funnel with every attempt status accounted for, including the ones that expired or were abandoned."
          icon={<LayersIcon aria-hidden="true" className="size-4" />}
          tint={TINT.teal}
          title="Where trainers drop out"
          expanded={<OutcomeFunnel summary={summary} />}
          detail={
            <StatGrid
              items={[
                { label: "Attempts created", value: summary.created.toString() },
                { label: "Never started", value: summary.notStarted.toString() },
                { label: "In progress", value: summary.inProgress.toString() },
                { label: "Submitted", value: summary.submitted.toString() },
                { label: "Expired", value: summary.expired.toString() },
                { label: "Abandoned", value: summary.abandoned.toString() },
                { label: "Qualified", value: summary.qualified.toString() },
                { label: "Not qualified", value: summary.notQualified.toString() },
              ]}
            />
          }
        >
          <OutcomeFunnel summary={summary} />
        </ChartCard>
      </div>

      <SectionHeading
        title="Timing and rhythm"
        description="How long attempts take and when they land"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          description={`${analytics.timeScore.length} recent attempts · each dot is one trainer`}
          expandedDescription="Completion time against score. Dots ringed in amber switched tabs at least once."
          icon={<HourglassIcon aria-hidden="true" className="size-4" />}
          tint={TINT.slate}
          title="Time against score"
          footer={
            <Legend
              items={[
                { color: VIZ.good, label: "Qualified" },
                { color: VIZ.critical, label: "Not qualified" },
                { color: VIZ.warn, label: "Tab switched" },
              ]}
            />
          }
          expanded={
            <TimeVersusScore
              passing={passing}
              points={analytics.timeScore}
              size="full"
            />
          }
          detail={
            <StatGrid
              items={[
                { label: "Fastest", value: formatDuration(summary.fastestDurationSeconds) },
                { label: "Median", value: formatDuration(summary.medianDurationSeconds) },
                { label: "Average", value: formatDuration(summary.averageDurationSeconds) },
                { label: "Slowest", value: formatDuration(summary.slowestDurationSeconds) },
              ]}
            />
          }
        >
          <TimeVersusScore passing={passing} points={analytics.timeScore} />
        </ChartCard>

        <ChartCard
          description={`${trendTotal} submissions over the last ${analytics.trendDays} days`}
          expandedDescription="Daily submissions with the qualified share shaded green; the amber line traces the average score for that day."
          icon={<TrendingUpIcon aria-hidden="true" className="size-4" />}
          title="Submissions trend"
          footer={
            <Legend
              items={[
                { color: VIZ.good, label: "Qualified" },
                { color: VIZ.series, label: "Not qualified" },
              ]}
            />
          }
          expanded={<SubmissionsTrend trend={analytics.trend} size="full" />}
          detail={
            <>
              <StatGrid
                items={[
                  { label: "In this period", value: trendTotal.toString() },
                  { label: "Today", value: summary.submittedToday.toString() },
                  { label: "Last 7 days", value: summary.submittedLast7Days.toString() },
                  {
                    hint:
                      busiestDay === null
                        ? undefined
                        : new Date(busiestDay.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          }),
                    label: "Busiest day",
                    value: busiestDay === null ? "—" : busiestDay.submitted.toString(),
                  },
                ]}
              />
              <DataTable
                columns={[
                  { key: "date", label: "Date" },
                  { align: "right", key: "submitted", label: "Submitted" },
                  { align: "right", key: "qualified", label: "Qualified" },
                  { align: "right", key: "averageScore", label: "Average score" },
                ]}
                rows={analytics.trend
                  .filter((day) => day.submitted > 0)
                  .reverse()
                  .map((day) => ({
                    cells: {
                      averageScore: formatPercent(day.averageScore, 1),
                      date: new Date(day.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }),
                      qualified: day.qualified,
                      submitted: day.submitted,
                    },
                    key: day.date,
                  }))}
              />
            </>
          }
        >
          <SubmissionsTrend trend={analytics.trend} />
        </ChartCard>

        <ChartCard
          description="Attempts grouped by how long they took"
          expandedDescription="Duration bands with the average score and pass rate for each, so a rushed attempt can be told apart from a considered one."
          icon={<ClockIcon aria-hidden="true" className="size-4" />}
          tint={TINT.amber}
          title="Time taken"
          expanded={
            <DurationSpread buckets={analytics.durationDistribution} size="full" />
          }
          detail={
            <DataTable
              columns={[
                { key: "band", label: "Duration" },
                { align: "right", key: "count", label: "Attempts" },
                { align: "right", key: "averageScore", label: "Average score" },
                { align: "right", key: "passRate", label: "Pass rate" },
              ]}
              rows={analytics.durationDistribution.map((bucket) => ({
                cells: {
                  averageScore: formatPercent(bucket.averageScore, 1),
                  band:
                    bucket.rangeEnd === null
                      ? `${bucket.rangeStart} minutes or more`
                      : `${bucket.rangeStart}–${bucket.rangeEnd} minutes`,
                  count: bucket.count,
                  passRate: formatPercent(bucket.passRate),
                },
                key: `duration-${bucket.rangeStart}`,
              }))}
            />
          }
        >
          <DurationSpread buckets={analytics.durationDistribution} />
        </ChartCard>

        <ChartCard
          description={`Busiest hour: ${peakHour.submitted} submissions`}
          expandedDescription="Submissions by hour of day and by day of week, in India Standard Time."
          icon={<ActivityIcon aria-hidden="true" className="size-4" />}
          tint={TINT.rose}
          title="When trainers submit"
          expanded={
            <div className="flex flex-col gap-6">
              <HourlyActivity hourly={analytics.hourly} size="full" />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  By day of week
                </p>
                <WeekdayActivity weekday={analytics.weekday} size="full" />
              </div>
            </div>
          }
          detail={
            <>
              <StatGrid
                items={[
                  {
                    hint: "hour of day",
                    label: "Peak hour",
                    value: `${peakHour.hour}:00`,
                  },
                  {
                    hint: `${peakWeekday.submitted} submissions`,
                    label: "Busiest weekday",
                    value: WEEKDAY_NAMES[peakWeekday.weekday - 1] ?? "—",
                  },
                ]}
              />
              <DataTable
                columns={[
                  { key: "day", label: "Day of week" },
                  { align: "right", key: "submitted", label: "Submitted" },
                  { align: "right", key: "averageScore", label: "Average score" },
                ]}
                rows={analytics.weekday.map((day) => ({
                  cells: {
                    averageScore: formatPercent(day.averageScore, 1),
                    day: WEEKDAY_NAMES[day.weekday - 1] ?? "—",
                    submitted: day.submitted,
                  },
                  key: `weekday-${day.weekday}`,
                }))}
              />
            </>
          }
        >
          <HourlyActivity hourly={analytics.hourly} />
        </ChartCard>
      </div>

      <SectionHeading
        title="Question quality"
        description="Which questions are doing their job, and which are not"
      />

      <ChartCard
        description={`The ${Math.min(10, analytics.itemAnalysis.length)} hardest of ${summary.questionsAnalysed} questions. Difficulty is the share answering correctly; discrimination compares the top and bottom score quartiles — a hard question that strong trainers also miss is usually a faulty question.`}
        expandedDescription="Every analysed question, with its category, quartile split, flag rate and the full spread of chosen answers."
        icon={<ListChecksIcon aria-hidden="true" className="size-4" />}
        title="Question quality"
        expanded={<ItemAnalysis items={analytics.itemAnalysis} variant="full" />}
        detail={
          <StatGrid
            items={[
              { label: "Questions analysed", value: summary.questionsAnalysed.toString() },
              { label: "In the paper", value: summary.questionsTotal.toString() },
              {
                hint: "discrimination under 20",
                label: "Flagged for review",
                value: weakItems.toString(),
              },
              {
                hint: "of served questions",
                label: "Marked for review",
                value: formatPercent(summary.flagRate, 1),
              },
            ]}
          />
        }
      >
        <ItemAnalysis items={analytics.itemAnalysis.slice(0, 10)} />
      </ChartCard>

      <SectionHeading
        title="Centres, states and integrity"
        description="Who is performing where, and what the monitoring recorded"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          description={`Average score across ${analytics.hubs.length} skill centres`}
          expandedDescription="Every centre with a submitted attempt, ranked by average score. Centres with fewer than three attempts are drawn faded — the number is not yet meaningful."
          icon={<Building2Icon aria-hidden="true" className="size-4" />}
          title="Centre comparison"
          expanded={<HubComparison hubs={analytics.hubs} />}
          detail={
            <DataTable
              columns={[
                { key: "hub", label: "Skill centre" },
                { key: "region", label: "State" },
                { align: "right", key: "attempts", label: "Attempts" },
                { align: "right", key: "averageScore", label: "Average" },
                { align: "right", key: "medianScore", label: "Median" },
                { align: "right", key: "bestScore", label: "Best" },
                { align: "right", key: "passRate", label: "Pass rate" },
                { align: "right", key: "warnings", label: "Tab switches" },
              ]}
              rows={analytics.hubs.map((hub) => ({
                cells: {
                  attempts: hub.attempts,
                  averageScore: formatPercent(hub.averageScore, 1),
                  bestScore: formatPercent(hub.bestScore, 1),
                  hub: hub.hub,
                  medianScore: formatPercent(hub.medianScore, 1),
                  passRate: formatPercent(hub.passRate),
                  region: hub.region,
                  warnings: hub.warnings,
                },
                key: `${hub.region}-${hub.hub}`,
              }))}
            />
          }
        >
          <HubComparison hubs={analytics.hubs} limit={6} />
        </ChartCard>

        <ChartCard
          description={`Average score across ${analytics.regions.length} states`}
          expandedDescription="Every state with a submitted attempt, ranked by average score."
          icon={<MapPinIcon aria-hidden="true" className="size-4" />}
          tint={TINT.rose}
          title="State comparison"
          expanded={<RegionComparison regions={analytics.regions} />}
          detail={
            <DataTable
              columns={[
                { key: "region", label: "State" },
                { align: "right", key: "hubs", label: "Centres" },
                { align: "right", key: "attempts", label: "Attempts" },
                { align: "right", key: "qualified", label: "Qualified" },
                { align: "right", key: "averageScore", label: "Average" },
                { align: "right", key: "passRate", label: "Pass rate" },
                { align: "right", key: "warnings", label: "Tab switches" },
              ]}
              rows={analytics.regions.map((region) => ({
                cells: {
                  attempts: region.attempts,
                  averageScore: formatPercent(region.averageScore, 1),
                  hubs: region.hubs,
                  passRate: formatPercent(region.passRate),
                  qualified: region.qualified,
                  region: region.region,
                  warnings: region.warnings,
                },
                key: region.region,
              }))}
            />
          }
        >
          <RegionComparison regions={analytics.regions} />
        </ChartCard>

        <Panel
          className="lg:col-span-1"
          description={`${analytics.integrity.totalWarnings} tab switches recorded, compared against outcomes`}
          icon={ShieldAlertIcon}
          tint={TINT.amber}
          title="Tab-switch warnings"
        >
          <IntegrityComparison
            integrity={analytics.integrity}
            warningLadder={analytics.warningLadder}
          />
        </Panel>

        <Panel
          description="Highest scores, fastest finish breaking a tie"
          icon={TrophyIcon}
          tint={TINT.green}
          title="Top performers"
        >
          <TopPerformers performers={analytics.topPerformers} />
        </Panel>
      </div>
    </main>
  );
}
