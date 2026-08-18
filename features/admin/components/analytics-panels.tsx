import {
  CircleAlertIcon,
  CircleCheckIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";

import type { Analytics } from "@/features/admin/data/get-admin-analytics";
import {
  CATEGORICAL,
  TINT,
  VIZ,
  formatDuration,
  formatNumber,
  formatPercent,
  type Tint,
} from "@/features/admin/components/dashboard-primitives";

/* -------------------------------------------------------------------- funnel */

export function OutcomeFunnel({ summary }: { summary: Analytics["summary"] }) {
  const steps = [
    { count: summary.created, hint: "Logged in", label: "Attempts created" },
    { count: summary.started, hint: "Opened the paper", label: "Started" },
    {
      count: summary.submitted,
      hint: "Finished and submitted",
      label: "Submitted",
    },
    {
      count: summary.qualified,
      hint: "Cleared the pass mark",
      label: "Qualified",
    },
  ];
  const top = Math.max(1, summary.created);

  return (
    <ul className="flex flex-col gap-4">
      {steps.map((step, index) => {
        const width = (step.count / top) * 100;
        const previous = index === 0 ? null : steps[index - 1].count;
        const lost = previous === null ? null : previous - step.count;
        const kept =
          previous === null || previous === 0
            ? null
            : Math.round((step.count / previous) * 100);

        return (
          <li key={step.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-medium text-foreground/85">
                {step.label}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {step.count}
                {kept === null ? null : (
                  <span className="ml-2 text-muted-foreground/80">
                    {kept}% carried through
                  </span>
                )}
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor:
                    index === steps.length - 1 ? VIZ.good : VIZ.series,
                  opacity: 1 - index * 0.12,
                  width: `${width}%`,
                }}
                title={`${step.label}: ${step.count} (${Math.round(width)}% of all attempts)`}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground/85">
              {step.hint}
              {lost !== null && lost > 0 ? (
                <span className="ml-1.5 text-muted-foreground">
                  · {lost} dropped here
                </span>
              ) : null}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/* --------------------------------------------------------------- percentiles */

/** Min–max rule with the quartile box drawn on it: the cohort at a glance. */
export function ScorePercentiles({
  passing,
  summary,
}: {
  passing: number | null;
  summary: Analytics["summary"];
}) {
  const { maxScore, medianScore, minScore, p10Score, p25Score, p75Score, p90Score } =
    summary;

  if (medianScore === null) {
    return (
      <p className="text-xs text-muted-foreground">No submitted attempts yet.</p>
    );
  }

  const marks = [
    { key: "Lowest", value: minScore },
    { key: "10th", value: p10Score },
    { key: "25th", value: p25Score },
    { key: "Median", value: medianScore },
    { key: "75th", value: p75Score },
    { key: "90th", value: p90Score },
    { key: "Highest", value: maxScore },
  ];

  return (
    <div>
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-6 h-2 rounded-full bg-muted" />
        {p10Score !== null && p90Score !== null ? (
          <div
            className="absolute top-6 h-2 rounded-full"
            style={{
              backgroundColor: VIZ.seriesSoft,
              left: `${p10Score}%`,
              width: `${Math.max(1, p90Score - p10Score)}%`,
            }}
          />
        ) : null}
        {p25Score !== null && p75Score !== null ? (
          <div
            className="absolute top-5 h-4 rounded-md"
            style={{
              backgroundColor: VIZ.series,
              left: `${p25Score}%`,
              opacity: 0.9,
              width: `${Math.max(1, p75Score - p25Score)}%`,
            }}
            title={`Middle half: ${p25Score}% to ${p75Score}%`}
          />
        ) : null}
        <div
          className="absolute top-3 h-8 w-[2px] rounded"
          style={{ backgroundColor: VIZ.seriesDeep, left: `${medianScore}%` }}
          title={`Median ${medianScore}%`}
        />
        {passing !== null ? (
          <div
            className="absolute top-2 h-10 border-l border-dashed"
            style={{ borderColor: VIZ.critical, left: `${passing}%` }}
            title={`Pass mark ${passing}%`}
          />
        ) : null}
        <span className="absolute top-0 left-0 text-xs text-muted-foreground tabular-nums">
          0%
        </span>
        <span className="absolute top-0 right-0 text-xs text-muted-foreground tabular-nums">
          100%
        </span>
      </div>

      <dl className="mt-1 grid grid-cols-4 gap-y-3 sm:grid-cols-7">
        {marks.map((mark) => (
          <div key={mark.key}>
            <dt className="text-xs text-muted-foreground">{mark.key}</dt>
            <dd className="text-sm font-medium text-foreground tabular-nums">
              {formatPercent(mark.value)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Scores sit within {formatNumber(summary.scoreStdDev)} points of the
        mean for a typical trainer. {summary.perfectScores} scored full marks
        and {summary.notQualified} finished below the pass mark.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- answer mix */

export function AnswerMix({ summary }: { summary: Analytics["summary"] }) {
  const correct = summary.averageCorrect ?? 0;
  const incorrect = summary.averageIncorrect ?? 0;
  const unanswered = summary.averageUnanswered ?? 0;
  const total = correct + incorrect + unanswered;

  if (total === 0) {
    return (
      <p className="text-xs text-muted-foreground">No submitted attempts yet.</p>
    );
  }

  const parts = [
    { color: VIZ.good, label: "Correct", value: correct },
    { color: VIZ.critical, label: "Incorrect", value: incorrect },
    { color: VIZ.warn, label: "Skipped", value: unanswered },
  ];

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {parts.map((part) => (
          <div
            key={part.label}
            style={{
              backgroundColor: part.color,
              width: `${(part.value / total) * 100}%`,
            }}
            title={`${part.label}: ${part.value.toFixed(1)} questions on average`}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {parts.map((part) => (
          <li key={part.label}>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-[3px]"
                style={{ backgroundColor: part.color }}
              />
              {part.label}
            </span>
            <span className="mt-1 block text-lg font-semibold text-foreground tabular-nums">
              {part.value.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                of {total.toFixed(0)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Averages per submitted attempt. {formatPercent(summary.flagRate, 1)} of
        all served questions were marked for review before submitting.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- integrity */

function IntegrityRow({
  attempts,
  averageScore,
  icon: Icon,
  label,
  passRate,
  tint,
}: {
  attempts: number;
  averageScore: number | null;
  icon: LucideIcon;
  label: string;
  passRate: number | null;
  tint: Tint;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span
          className="flex size-6 items-center justify-center rounded-md"
          style={{ backgroundColor: tint.bg, color: tint.fg }}
        >
          <Icon aria-hidden="true" className="size-3.5" />
        </span>
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold text-foreground tabular-nums">
        {formatPercent(averageScore)}
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          average score
        </span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {attempts} {attempts === 1 ? "attempt" : "attempts"} ·{" "}
        {formatPercent(passRate)} pass rate
      </p>
    </div>
  );
}

export function IntegrityComparison({
  integrity,
  warningLadder,
}: {
  integrity: Analytics["integrity"];
  warningLadder: Analytics["warningLadder"];
}) {
  const gap =
    integrity.clean.averageScore !== null &&
    integrity.flagged.averageScore !== null
      ? Math.round(integrity.clean.averageScore - integrity.flagged.averageScore)
      : null;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <IntegrityRow
          attempts={integrity.clean.attempts}
          averageScore={integrity.clean.averageScore}
          icon={ShieldCheckIcon}
          label="No warnings"
          passRate={integrity.clean.passRate}
          tint={TINT.green}
        />
        <IntegrityRow
          attempts={integrity.flagged.attempts}
          averageScore={integrity.flagged.averageScore}
          icon={TriangleAlertIcon}
          label="One or more warnings"
          passRate={integrity.flagged.passRate}
          tint={TINT.red}
        />
      </div>

      <WarningLadder ladder={warningLadder} />

      {gap !== null && integrity.flagged.attempts > 0 ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {gap === 0
            ? "Flagged attempts score the same as clean ones."
            : gap > 0
              ? `Flagged attempts score ${gap} points lower on average.`
              : `Flagged attempts score ${Math.abs(gap)} points higher on average.`}{" "}
          The busiest attempt switched away {integrity.maxWarnings}{" "}
          {integrity.maxWarnings === 1 ? "time" : "times"}. Warnings alone are
          not evidence — read them alongside the report.
        </p>
      ) : null}
    </div>
  );
}

export function WarningLadder({
  ladder,
}: {
  ladder: Analytics["warningLadder"];
}) {
  const top = Math.max(1, ...ladder.map((rung) => rung.attempts));

  return (
    <table className="mt-4 w-full text-left text-xs">
      <thead>
        <tr className="text-muted-foreground">
          <th scope="col" className="pb-2 font-medium">
            Tab switches
          </th>
          <th scope="col" className="pb-2 font-medium">
            Attempts
          </th>
          <th scope="col" className="pb-2 text-right font-medium">
            Average score
          </th>
          <th scope="col" className="pb-2 text-right font-medium">
            Pass rate
          </th>
        </tr>
      </thead>
      <tbody>
        {ladder.map((rung) => (
          <tr key={rung.bucket} className="border-t border-border/50">
            <td className="py-2 pr-3 text-foreground/85">{rung.label}</td>
            <td className="w-1/2 py-2 pr-3">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      backgroundColor:
                        rung.bucket === 0 ? VIZ.good : VIZ.warn,
                      width: `${(rung.attempts / top) * 100}%`,
                    }}
                  />
                </span>
                <span className="text-foreground/85 tabular-nums">
                  {rung.attempts}
                </span>
              </span>
            </td>
            <td className="py-2 text-right text-foreground/85 tabular-nums">
              {formatPercent(rung.averageScore, 1)}
            </td>
            <td className="py-2 text-right text-foreground/85 tabular-nums">
              {formatPercent(rung.passRate)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* --------------------------------------------------------------- ranked bars */

export function RankedBars({
  emptyMessage,
  rows,
  thinBelow = 3,
}: {
  emptyMessage: string;
  rows: {
    color?: string;
    count: number;
    key: string;
    meta?: string;
    primary: string;
    secondary?: string;
    value: number | null;
  }[];
  /** Below this many attempts a row is drawn faded and called out as thin. */
  thinBelow?: number;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((row, index) => {
        const value = row.value ?? 0;
        const thin = row.count < thinBelow;

        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-xs font-medium text-foreground/85">
                {row.primary}
                {row.secondary ? (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    {row.secondary}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatPercent(row.value, 1)} · n={row.count}
                {thin ? (
                  <span className="ml-1.5 text-muted-foreground/70">
                    too few to rank
                  </span>
                ) : null}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor:
                    row.color ?? CATEGORICAL[index % CATEGORICAL.length],
                  opacity: thin ? 0.4 : 1,
                  width: `${Math.max(0, Math.min(100, value))}%`,
                }}
                title={`${row.primary}: ${formatPercent(row.value, 1)} across ${row.count}`}
              />
            </div>
            {row.meta ? (
              <p className="mt-1 text-xs text-muted-foreground/85 tabular-nums">
                {row.meta}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function HubComparison({
  hubs,
  limit,
}: {
  hubs: Analytics["hubs"];
  limit?: number;
}) {
  return (
    <RankedBars
      emptyMessage="No submitted attempts yet."
      rows={(limit ? hubs.slice(0, limit) : hubs).map((hub) => ({
        color: VIZ.series,
        count: hub.attempts,
        key: `${hub.region}-${hub.hub}`,
        meta: `${hub.qualified} qualified · ${formatPercent(hub.passRate)} pass rate · median ${formatPercent(hub.medianScore, 1)} · ${formatDuration(hub.medianDurationSeconds)} typical · ${hub.warnings} tab ${hub.warnings === 1 ? "switch" : "switches"}`,
        primary: hub.hub,
        secondary: hub.region,
        value: hub.averageScore,
      }))}
    />
  );
}

export function RegionComparison({ regions }: { regions: Analytics["regions"] }) {
  return (
    <RankedBars
      emptyMessage="No submitted attempts yet."
      rows={regions.map((region) => ({
        count: region.attempts,
        key: region.region,
        meta: `${region.hubs} ${region.hubs === 1 ? "centre" : "centres"} · ${region.qualified} qualified · ${formatPercent(region.passRate)} pass rate · ${region.warnings} tab ${region.warnings === 1 ? "switch" : "switches"}`,
        primary: region.region,
        value: region.averageScore,
      }))}
    />
  );
}

/* ------------------------------------------------------------ top performers */

export function TopPerformers({
  performers,
}: {
  performers: Analytics["topPerformers"];
}) {
  if (performers.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No submitted attempts yet.</p>
    );
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {performers.map((performer, index) => (
        <li
          key={`${performer.name}-${index}`}
          className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5"
        >
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
            style={{
              backgroundColor: index === 0 ? TINT.amber.bg : TINT.slate.bg,
              color: index === 0 ? TINT.amber.fg : TINT.slate.fg,
            }}
          >
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {performer.name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {performer.hub} · {performer.region}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-sm font-semibold text-foreground tabular-nums">
              {formatPercent(performer.score, 1)}
            </span>
            <span className="block text-xs text-muted-foreground tabular-nums">
              {formatDuration(performer.durationSeconds)}
              {performer.warnings > 0 ? ` · ${performer.warnings} flag` : ""}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------ item analysis */

/** The full answer spread for one question, correct option first in green. */
function OptionSpread({
  options,
  presented,
}: {
  options: Analytics["itemAnalysis"][number]["options"];
  presented: number;
}) {
  const picked = options.reduce((sum, option) => sum + option.picks, 0);
  const skipped = Math.max(0, presented - picked);

  return (
    <span className="flex h-2 w-full min-w-[120px] overflow-hidden rounded-full bg-muted">
      {options.map((option, index) => (
        <span
          key={option.code}
          style={{
            backgroundColor: option.isCorrect
              ? VIZ.good
              : CATEGORICAL[(index + 1) % CATEGORICAL.length],
            width: `${presented === 0 ? 0 : (option.picks / presented) * 100}%`,
          }}
          title={`${option.code}. ${option.text} — ${option.picks} picked (${formatPercent(option.share, 1)})${option.isCorrect ? " · correct answer" : ""}`}
        />
      ))}
      {skipped > 0 ? (
        <span
          style={{
            backgroundColor: VIZ.grid,
            width: `${(skipped / presented) * 100}%`,
          }}
          title={`${skipped} left this question unanswered`}
        />
      ) : null}
    </span>
  );
}

function DiscriminationCell({ value }: { value: number | null }) {
  const weak = value !== null && value < 20;

  return (
    <>
      <span className="font-medium text-foreground">
        {value === null ? "—" : value.toFixed(1)}
      </span>
      {weak ? (
        <span
          className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: TINT.amber.bg, color: TINT.amber.fg }}
        >
          <CircleAlertIcon aria-hidden="true" className="size-3" />
          Review
        </span>
      ) : (
        <span className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <CircleCheckIcon aria-hidden="true" className="size-3" />
          Sound
        </span>
      )}
    </>
  );
}

export function ItemAnalysis({
  items,
  variant = "card",
}: {
  items: Analytics["itemAnalysis"];
  /** "full" adds the category, quartile split, flag rate and answer spread. */
  variant?: "card" | "full";
}) {
  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
        No answers recorded yet.
      </div>
    );
  }

  const full = variant === "full";

  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-border/60">
      <table
        className={`w-full ${full ? "min-w-[1080px]" : "min-w-[820px]"} border-collapse text-left text-sm`}
      >
        <thead>
          <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold text-foreground/75">
            <th scope="col" className="px-5 py-3">
              Question
            </th>
            {full ? (
              <th scope="col" className="px-3 py-3">
                Category
              </th>
            ) : null}
            <th scope="col" className="px-3 py-3 text-center">
              Difficulty
            </th>
            {full ? (
              <th scope="col" className="px-3 py-3 text-center">
                Top vs bottom quartile
              </th>
            ) : null}
            <th scope="col" className="px-3 py-3 text-center">
              Discrimination
            </th>
            <th scope="col" className="px-3 py-3 text-center">
              Skipped
            </th>
            {full ? (
              <th scope="col" className="px-3 py-3 text-center">
                Flagged
              </th>
            ) : null}
            {full ? (
              <th scope="col" className="px-3 py-3">
                Answer spread
              </th>
            ) : null}
            <th scope="col" className="px-5 py-3">
              Most-chosen wrong answer
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.code}
              className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
            >
              <td className="max-w-md px-5 py-4">
                <span
                  className="block truncate text-foreground"
                  title={item.prompt}
                >
                  {item.prompt}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                  {item.code} · {item.presented}{" "}
                  {item.presented === 1 ? "attempt" : "attempts"} · usually seen
                  at position {item.averagePosition ?? "—"}
                </span>
              </td>

              {full ? (
                <td className="px-3 py-4 text-xs text-foreground/80">
                  {item.category ?? "—"}
                  {item.difficultyLabel ? (
                    <span className="mt-0.5 block text-muted-foreground">
                      rated {item.difficultyLabel}
                    </span>
                  ) : null}
                </td>
              ) : null}

              <td className="px-3 py-4 text-center font-medium text-foreground tabular-nums">
                {formatPercent(item.difficultyIndex, 1)}
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {item.correct} of {item.presented} correct
                </span>
              </td>

              {full ? (
                <td className="px-3 py-4 text-center text-xs text-foreground/80 tabular-nums">
                  {formatPercent(item.topQuartileCorrect, 1)}
                  <span className="mx-1 text-muted-foreground">vs</span>
                  {formatPercent(item.bottomQuartileCorrect, 1)}
                </td>
              ) : null}

              <td className="px-3 py-4 text-center tabular-nums">
                <DiscriminationCell value={item.discriminationIndex} />
              </td>

              <td className="px-3 py-4 text-center text-foreground/80 tabular-nums">
                {formatPercent(item.unansweredRate, 1)}
              </td>

              {full ? (
                <td className="px-3 py-4 text-center text-foreground/80 tabular-nums">
                  {formatPercent(item.flagRate, 1)}
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.flagged} marked
                  </span>
                </td>
              ) : null}

              {full ? (
                <td className="min-w-[160px] px-3 py-4">
                  <OptionSpread
                    options={item.options}
                    presented={item.presented}
                  />
                  <span className="mt-1.5 block text-xs text-muted-foreground">
                    {item.options
                      .map(
                        (option) =>
                          `${option.code} ${formatPercent(option.share, 0)}`,
                      )
                      .join(" · ")}
                  </span>
                </td>
              ) : null}

              <td className="max-w-xs px-5 py-4">
                {item.topDistractor ? (
                  <>
                    <span className="block truncate text-xs text-foreground/85">
                      {item.topDistractor}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                      chosen {item.topDistractorPicks ?? 0}×
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
