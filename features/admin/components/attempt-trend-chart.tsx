import Link from "next/link";

import {
  TREND_RANGES,
  type AdminDashboard,
  type TrendRange,
} from "@/features/admin/data/get-admin-dashboard";
import {
  EmptyPlot,
  Panel,
  VIZ,
} from "@/features/admin/components/dashboard-primitives";

/** Range switch. Links rather than state, so the server re-queries the RPC. */
function RangePicker({ active }: { active: TrendRange }) {
  return (
    <div
      role="group"
      aria-label="Trend range"
      className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-0.5"
    >
      {TREND_RANGES.map((range) => {
        const isActive = range === active;

        return (
          <Link
            key={range}
            href={`/admin/dashboard?trend=${range}`}
            scroll={false}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-md px-2 py-1 text-xs tabular-nums transition-colors ${
              isActive
                ? "bg-background font-medium text-foreground shadow-[0_1px_2px_rgba(11,11,11,0.06)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {range}d
          </Link>
        );
      })}
    </div>
  );
}

const WIDTH = 560;
const HEIGHT = 180;
const PAD = { bottom: 24, left: 30, right: 8, top: 12 };
const BAR_GAP = 3;

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function AttemptTrendChart({
  range,
  trend,
}: {
  range: TrendRange;
  trend: AdminDashboard["trend"];
}) {
  const total = trend.reduce((sum, day) => sum + day.started, 0);

  if (total === 0) {
    return (
      <Panel
        title="Attempts started"
        description={`Daily count over the last ${trend.length} days`}
        action={<RangePicker active={range} />}
      >
        <EmptyPlot message="No attempts in this period." />
      </Panel>
    );
  }

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const maxCount = Math.max(...trend.map((day) => day.started));
  const axisMax = Math.max(1, Math.ceil(maxCount / 2) * 2);
  const bandWidth = plotWidth / trend.length;
  const barWidth = Math.max(4, bandWidth - BAR_GAP);

  return (
    <Panel
      title="Attempts started"
      description={`${total} in the last ${trend.length} days`}
      action={<RangePicker active={range} />}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Attempts started per day over ${trend.length} days, ${total} in total.`}
      >
        {[0, axisMax / 2, axisMax].map((tick) => {
          const y = PAD.top + plotHeight - (tick / axisMax) * plotHeight;

          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y}
                y2={y}
                stroke={tick === 0 ? VIZ.axis : VIZ.grid}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fill={VIZ.muted}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {trend.map((day, index) => {
          const barHeight =
            day.started === 0 ? 0 : (day.started / axisMax) * plotHeight;
          const x = PAD.left + index * bandWidth + BAR_GAP / 2;
          const y = PAD.top + plotHeight - barHeight;
          const isLabelled = index === 0 || index === trend.length - 1;

          return (
            <g key={day.date}>
              {day.started > 0 ? (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={VIZ.series}
                  className="transition-opacity hover:opacity-80"
                >
                  <title>
                    {formatDay(day.date)}: {day.started} started,{" "}
                    {day.submitted} submitted
                  </title>
                </rect>
              ) : (
                <rect
                  x={x}
                  y={PAD.top + plotHeight - 2}
                  width={barWidth}
                  height={2}
                  rx={1}
                  fill={VIZ.grid}
                >
                  <title>{formatDay(day.date)}: no attempts</title>
                </rect>
              )}
              {isLabelled ? (
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT - 8}
                  textAnchor={index === 0 ? "start" : "end"}
                  fontSize={9}
                  fill={VIZ.muted}
                >
                  {formatDay(day.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}
