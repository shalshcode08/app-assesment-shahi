import type { ReactNode } from "react";

import type { Analytics } from "@/features/admin/data/get-admin-analytics";
import {
  EmptyPlot,
  VIZ,
} from "@/features/admin/components/dashboard-primitives";

/**
 * Every chart draws at two sizes from one definition: "card" for the grid on
 * the page and "full" for the expanded dialog. Full is not the card scaled up —
 * it spends the extra room on labels, ticks and value annotations that would
 * crowd the card, so expanding a chart genuinely tells the reader more.
 */
export type ChartSize = "card" | "full";

type Pad = { bottom: number; left: number; right: number; top: number };

type Frame = {
  font: number;
  full: boolean;
  height: number;
  pad: Pad;
  plotH: number;
  plotW: number;
  width: number;
};

function frame(
  size: ChartSize,
  pad: Pad,
  { cardHeight = 210, fullHeight = 400 } = {},
): Frame {
  const full = size === "full";
  const width = full ? 960 : 560;
  const height = full ? fullHeight : cardHeight;
  const scaled: Pad = full
    ? {
        bottom: pad.bottom * 1.5,
        left: pad.left * 1.45,
        right: pad.right * 1.4,
        top: pad.top * 1.5,
      }
    : pad;

  return {
    font: full ? 12 : 9,
    full,
    height,
    pad: scaled,
    plotH: height - scaled.top - scaled.bottom,
    plotW: width - scaled.left - scaled.right,
    width,
  };
}

function niceMax(value: number, step = 2) {
  return Math.max(step, Math.ceil(value / step) * step);
}

function ticksOf(max: number, count: number) {
  return Array.from({ length: count + 1 }, (_, index) => (max / count) * index);
}

function Plot({
  children,
  f,
  label,
}: {
  children: ReactNode;
  f: Frame;
  label: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${f.width} ${f.height}`}
      className="h-auto w-full"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

/** Horizontal gridlines with a value label on each. */
function YGrid({
  f,
  format = (value: number) => `${Math.round(value)}`,
  max,
  ticks,
}: {
  f: Frame;
  format?: (value: number) => string;
  max: number;
  ticks?: number;
}) {
  const count = ticks ?? (f.full ? 5 : 2);

  return (
    <>
      {ticksOf(max, count).map((tick) => {
        const y = f.pad.top + f.plotH - (tick / max) * f.plotH;

        return (
          <g key={tick}>
            <line
              x1={f.pad.left}
              x2={f.width - f.pad.right}
              y1={y}
              y2={y}
              stroke={tick === 0 ? VIZ.axis : VIZ.grid}
              strokeWidth={1}
            />
            <text
              x={f.pad.left - 6}
              y={y + f.font / 3}
              textAnchor="end"
              fontSize={f.font}
              fill={VIZ.muted}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {format(tick)}
            </text>
          </g>
        );
      })}
    </>
  );
}

function AxisTitle({
  f,
  x,
  y,
}: {
  f: Frame;
  x?: string;
  y?: string;
}) {
  return (
    <>
      {x ? (
        <text
          x={f.width - f.pad.right}
          y={f.height - 4}
          textAnchor="end"
          fontSize={f.font}
          fill={VIZ.muted}
        >
          {x}
        </text>
      ) : null}
      {y ? (
        <text
          x={f.pad.left - 6}
          y={f.pad.top - 8}
          textAnchor="end"
          fontSize={f.font}
          fill={VIZ.muted}
        >
          {y}
        </text>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------- histogram */

export function ScoreSpread({
  distribution,
  median,
  p25,
  p75,
  passing,
  size = "card",
}: {
  distribution: Analytics["scoreDistribution"];
  median: number | null;
  p25: number | null;
  p75: number | null;
  passing: number | null;
  size?: ChartSize;
}) {
  const total = distribution.reduce((sum, bucket) => sum + bucket.count, 0);

  if (total === 0) {
    return <EmptyPlot message="No submitted attempts yet." />;
  }

  const f = frame(size, { bottom: 30, left: 34, right: 12, top: 20 });
  const axisMax = niceMax(Math.max(...distribution.map((b) => b.count)));
  const band = f.plotW / distribution.length;
  const xOf = (percent: number) => f.pad.left + (percent / 100) * f.plotW;
  const yOf = (count: number) => f.pad.top + f.plotH - (count / axisMax) * f.plotH;

  return (
    <Plot
      f={f}
      label={`Score distribution across ${total} submitted attempts. Median ${median ?? "unknown"} percent, middle half ${p25 ?? "unknown"} to ${p75 ?? "unknown"} percent.`}
    >
      <YGrid f={f} max={axisMax} />

      {p25 !== null && p75 !== null ? (
        <rect
          x={xOf(p25)}
          y={f.pad.top}
          width={Math.max(1, xOf(p75) - xOf(p25))}
          height={f.plotH}
          fill={VIZ.series}
          opacity={0.06}
        >
          <title>{`Middle half of trainers scored ${p25}% to ${p75}%`}</title>
        </rect>
      ) : null}

      {distribution.map((bucket, index) => {
        const x = f.pad.left + index * band + 1;
        const barW = band - 2;
        const qualifiedH =
          bucket.qualified === 0 ? 0 : (bucket.qualified / axisMax) * f.plotH;
        const totalH = bucket.count === 0 ? 0 : (bucket.count / axisMax) * f.plotH;
        const showLabel = f.full || index % 2 === 0;

        return (
          <g key={bucket.rangeStart}>
            {bucket.count > 0 ? (
              <g className="transition-opacity hover:opacity-80">
                <rect
                  x={x}
                  y={yOf(bucket.count)}
                  width={barW}
                  height={totalH}
                  rx={4}
                  fill={VIZ.series}
                />
                {bucket.qualified > 0 ? (
                  <rect
                    x={x}
                    y={f.pad.top + f.plotH - qualifiedH}
                    width={barW}
                    height={qualifiedH}
                    rx={4}
                    fill={VIZ.good}
                  />
                ) : null}
                <title>
                  {`${bucket.rangeStart}–${bucket.rangeEnd}%: ${bucket.count} ${bucket.count === 1 ? "trainer" : "trainers"} · ${bucket.qualified} qualified, ${bucket.notQualified} not`}
                </title>
              </g>
            ) : null}

            {f.full && bucket.count > 0 ? (
              <text
                x={x + barW / 2}
                y={yOf(bucket.count) - 5}
                textAnchor="middle"
                fontSize={f.font}
                fill={VIZ.muted}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {bucket.count}
              </text>
            ) : null}

            {showLabel ? (
              <text
                x={x + barW / 2}
                y={f.height - f.pad.bottom + f.font + 4}
                textAnchor="middle"
                fontSize={f.font}
                fill={VIZ.muted}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {f.full ? `${bucket.rangeStart}–${bucket.rangeEnd}` : bucket.rangeStart}
              </text>
            ) : null}
          </g>
        );
      })}

      {passing !== null ? (
        <g>
          <line
            x1={xOf(passing)}
            x2={xOf(passing)}
            y1={f.pad.top}
            y2={f.pad.top + f.plotH}
            stroke={VIZ.critical}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          {f.full ? (
            <text
              x={xOf(passing) + 4}
              y={f.pad.top + f.plotH - 6}
              fontSize={f.font}
              fill={VIZ.critical}
            >
              {`pass mark ${passing}%`}
            </text>
          ) : null}
          <title>{`Pass mark ${passing}%`}</title>
        </g>
      ) : null}

      {median !== null ? (
        <g>
          <line
            x1={xOf(median)}
            x2={xOf(median)}
            y1={f.pad.top - 8}
            y2={f.pad.top + f.plotH}
            stroke={VIZ.seriesDeep}
            strokeWidth={1.5}
          />
          <text
            x={xOf(median) + 4}
            y={f.pad.top - 10}
            fontSize={f.font}
            fill={VIZ.seriesDeep}
          >
            {`median ${median}%`}
          </text>
        </g>
      ) : null}

      <AxisTitle f={f} x="score %" y={f.full ? "attempts" : undefined} />
    </Plot>
  );
}

/* ------------------------------------------------------------------ scatter */

export function TimeVersusScore({
  passing,
  points,
  size = "card",
}: {
  passing: number | null;
  points: Analytics["timeScore"];
  size?: ChartSize;
}) {
  const usable = points.filter(
    (point) => point.minutes !== null && point.score !== null,
  );

  if (usable.length === 0) {
    return <EmptyPlot message="No submitted attempts yet." />;
  }

  const f = frame(size, { bottom: 30, left: 34, right: 14, top: 16 });
  const maxMinutes = Math.max(
    5,
    Math.ceil(Math.max(...usable.map((point) => point.minutes ?? 0)) / 5) * 5,
  );
  const xOf = (minutes: number) => f.pad.left + (minutes / maxMinutes) * f.plotW;
  const yOf = (score: number) => f.pad.top + f.plotH - (score / 100) * f.plotH;
  const minuteTicks = f.full
    ? Array.from({ length: 7 }, (_, index) => (maxMinutes / 6) * index)
    : [0, maxMinutes / 2, maxMinutes];

  return (
    <Plot
      f={f}
      label={`Completion time against score for ${usable.length} submitted attempts.`}
    >
      <YGrid
        f={f}
        max={100}
        ticks={4}
        format={(value) => `${Math.round(value)}`}
      />

      {passing !== null ? (
        <g>
          <rect
            x={f.pad.left}
            y={f.pad.top}
            width={f.plotW}
            height={Math.max(0, yOf(passing) - f.pad.top)}
            fill={VIZ.good}
            opacity={0.05}
          />
          <line
            x1={f.pad.left}
            x2={f.width - f.pad.right}
            y1={yOf(passing)}
            y2={yOf(passing)}
            stroke={VIZ.critical}
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text
            x={f.width - f.pad.right}
            y={yOf(passing) - 4}
            textAnchor="end"
            fontSize={f.font}
            fill={VIZ.critical}
          >
            {`pass ${passing}%`}
          </text>
        </g>
      ) : null}

      {usable.map((point, index) => (
        <circle
          key={index}
          cx={xOf(point.minutes ?? 0)}
          cy={yOf(point.score ?? 0)}
          r={f.full ? 5 : 4}
          fill={point.qualified ? VIZ.good : VIZ.critical}
          fillOpacity={0.55}
          stroke={point.warnings > 0 ? VIZ.warn : "#ffffff"}
          strokeWidth={point.warnings > 0 ? 2 : 1.2}
        >
          <title>
            {`${Math.round((point.minutes ?? 0) * 10) / 10} min · ${Math.round(point.score ?? 0)}% · ${point.qualified ? "qualified" : "not qualified"}${point.warnings > 0 ? ` · ${point.warnings} tab ${point.warnings === 1 ? "switch" : "switches"}` : ""}`}
          </title>
        </circle>
      ))}

      {minuteTicks.map((minute, index) => (
        <text
          key={minute}
          x={xOf(minute)}
          y={f.height - f.pad.bottom + f.font + 4}
          textAnchor={
            index === 0
              ? "start"
              : index === minuteTicks.length - 1
                ? "end"
                : "middle"
          }
          fontSize={f.font}
          fill={VIZ.muted}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {`${Math.round(minute)}m`}
        </text>
      ))}

      <AxisTitle f={f} x="minutes taken" y={f.full ? "score %" : undefined} />
    </Plot>
  );
}

/* -------------------------------------------------------------------- trend */

export function SubmissionsTrend({
  size = "card",
  trend,
}: {
  size?: ChartSize;
  trend: Analytics["trend"];
}) {
  const total = trend.reduce((sum, day) => sum + day.submitted, 0);

  if (total === 0) {
    return <EmptyPlot message="No submissions in this period." />;
  }

  const f = frame(size, { bottom: 26, left: 32, right: 14, top: 16 });
  const axisMax = niceMax(Math.max(...trend.map((day) => day.submitted)));
  const band = f.plotW / trend.length;
  const scored = trend.filter((day) => day.averageScore !== null);
  const fmt = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  const labelEvery = f.full ? Math.max(1, Math.round(trend.length / 8)) : null;

  return (
    <Plot
      f={f}
      label={`Daily submissions over ${trend.length} days, ${total} in total.`}
    >
      <YGrid f={f} max={axisMax} />

      {trend.map((day, index) => {
        const x = f.pad.left + index * band + 1;
        const barW = Math.max(3, band - 2);
        const totalH =
          day.submitted === 0 ? 0 : (day.submitted / axisMax) * f.plotH;
        const qualifiedH =
          day.qualified === 0 ? 0 : (day.qualified / axisMax) * f.plotH;

        return (
          <g key={day.date} className="transition-opacity hover:opacity-80">
            {day.submitted === 0 ? (
              <rect
                x={x}
                y={f.pad.top + f.plotH - 2}
                width={barW}
                height={2}
                rx={1}
                fill={VIZ.grid}
              />
            ) : (
              <>
                <rect
                  x={x}
                  y={f.pad.top + f.plotH - totalH}
                  width={barW}
                  height={totalH}
                  rx={3}
                  fill={VIZ.series}
                />
                {day.qualified > 0 ? (
                  <rect
                    x={x}
                    y={f.pad.top + f.plotH - qualifiedH}
                    width={barW}
                    height={qualifiedH}
                    rx={3}
                    fill={VIZ.good}
                  />
                ) : null}
              </>
            )}
            <title>
              {`${fmt(day.date)}: ${day.submitted} submitted, ${day.qualified} qualified${day.averageScore === null ? "" : `, average ${day.averageScore}%`}`}
            </title>
          </g>
        );
      })}

      {/* Average score rides a hidden 0–100 axis; the shape is the point. */}
      {f.full && scored.length > 1 ? (
        <polyline
          fill="none"
          stroke={VIZ.warn}
          strokeWidth={1.75}
          strokeLinejoin="round"
          points={scored
            .map((day) => {
              const index = trend.indexOf(day);
              const x = f.pad.left + index * band + band / 2;
              const y =
                f.pad.top + f.plotH - ((day.averageScore ?? 0) / 100) * f.plotH;
              return `${x},${y}`;
            })
            .join(" ")}
        />
      ) : null}

      {trend.map((day, index) => {
        const show =
          labelEvery === null
            ? index === 0 || index === trend.length - 1
            : index % labelEvery === 0 || index === trend.length - 1;

        if (!show) {
          return null;
        }

        const x = f.pad.left + index * band + band / 2;

        return (
          <text
            key={`label-${day.date}`}
            x={x}
            y={f.height - f.pad.bottom + f.font + 4}
            textAnchor={
              index === 0 ? "start" : index === trend.length - 1 ? "end" : "middle"
            }
            fontSize={f.font}
            fill={VIZ.muted}
          >
            {fmt(day.date)}
          </text>
        );
      })}
    </Plot>
  );
}

/* ----------------------------------------------------------- simple columns */

function Columns({
  bars,
  f,
  label,
  suffix = "",
}: {
  bars: { key: string; label: string | null; title: string; value: number }[];
  f: Frame;
  label: string;
  suffix?: string;
}) {
  const axisMax = niceMax(Math.max(1, ...bars.map((bar) => bar.value)));
  const band = f.plotW / bars.length;

  return (
    <Plot f={f} label={label}>
      <YGrid f={f} max={axisMax} />
      {bars.map((bar, index) => {
        const x = f.pad.left + index * band + 1;
        const barW = Math.max(3, band - (f.full ? 6 : 3));
        const height = bar.value === 0 ? 0 : (bar.value / axisMax) * f.plotH;

        return (
          <g key={bar.key}>
            <rect
              x={x}
              y={bar.value === 0 ? f.pad.top + f.plotH - 2 : f.pad.top + f.plotH - height}
              width={barW}
              height={bar.value === 0 ? 2 : height}
              rx={3}
              fill={bar.value === 0 ? VIZ.grid : VIZ.series}
              className="transition-opacity hover:opacity-80"
            >
              <title>{bar.title}</title>
            </rect>
            {f.full && bar.value > 0 ? (
              <text
                x={x + barW / 2}
                y={f.pad.top + f.plotH - height - 5}
                textAnchor="middle"
                fontSize={f.font}
                fill={VIZ.muted}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {`${bar.value}${suffix}`}
              </text>
            ) : null}
            {bar.label ? (
              <text
                x={x + barW / 2}
                y={f.height - f.pad.bottom + f.font + 4}
                textAnchor="middle"
                fontSize={f.font}
                fill={VIZ.muted}
              >
                {bar.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </Plot>
  );
}

const HOUR_LABEL = (hour: number) =>
  hour === 0
    ? "12a"
    : hour === 12
      ? "12p"
      : hour < 12
        ? `${hour}a`
        : `${hour - 12}p`;

export function HourlyActivity({
  hourly,
  size = "card",
}: {
  hourly: Analytics["hourly"];
  size?: ChartSize;
}) {
  const total = hourly.reduce((sum, hour) => sum + hour.submitted, 0);

  if (total === 0) {
    return <EmptyPlot message="No submissions to place on the clock yet." />;
  }

  const f = frame(size, { bottom: 26, left: 30, right: 10, top: 16 }, {
    cardHeight: 180,
    fullHeight: 340,
  });

  return (
    <Columns
      f={f}
      label={`Submissions by hour of day, ${total} in total.`}
      bars={hourly.map((entry) => ({
        key: `hour-${entry.hour}`,
        label:
          f.full || entry.hour % 6 === 0 ? HOUR_LABEL(entry.hour) : null,
        title: `${HOUR_LABEL(entry.hour)}: ${entry.submitted} submitted`,
        value: entry.submitted,
      }))}
    />
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekdayActivity({
  size = "card",
  weekday,
}: {
  size?: ChartSize;
  weekday: Analytics["weekday"];
}) {
  const total = weekday.reduce((sum, day) => sum + day.submitted, 0);

  if (total === 0) {
    return <EmptyPlot message="No submissions to place on the week yet." />;
  }

  const f = frame(size, { bottom: 26, left: 30, right: 10, top: 16 }, {
    cardHeight: 180,
    fullHeight: 340,
  });

  return (
    <Columns
      f={f}
      label={`Submissions by day of week, ${total} in total.`}
      bars={weekday.map((day) => ({
        key: `weekday-${day.weekday}`,
        label: WEEKDAYS[day.weekday - 1] ?? "—",
        title: `${WEEKDAYS[day.weekday - 1]}: ${day.submitted} submitted${day.averageScore === null ? "" : `, average ${day.averageScore}%`}`,
        value: day.submitted,
      }))}
    />
  );
}

export function DurationSpread({
  buckets,
  size = "card",
}: {
  buckets: Analytics["durationDistribution"];
  size?: ChartSize;
}) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  if (total === 0) {
    return <EmptyPlot message="No submitted attempts yet." />;
  }

  const f = frame(size, { bottom: 26, left: 30, right: 10, top: 16 }, {
    cardHeight: 180,
    fullHeight: 340,
  });

  return (
    <Columns
      f={f}
      label={`Attempts by how long they took, ${total} in total.`}
      bars={buckets.map((bucket) => {
        const range =
          bucket.rangeEnd === null
            ? `${bucket.rangeStart}m+`
            : `${bucket.rangeStart}–${bucket.rangeEnd}m`;

        return {
          key: `duration-${bucket.rangeStart}`,
          label: range,
          title: `${range}: ${bucket.count} ${bucket.count === 1 ? "attempt" : "attempts"}${bucket.averageScore === null ? "" : `, average ${bucket.averageScore}%`}${bucket.passRate === null ? "" : `, ${bucket.passRate}% passed`}`,
          value: bucket.count,
        };
      })}
    />
  );
}
