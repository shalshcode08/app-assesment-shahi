import type { AdminDashboard } from "@/features/admin/data/get-admin-dashboard";
import {
  EmptyPlot,
  Panel,
  VIZ,
} from "@/features/admin/components/dashboard-primitives";

const WIDTH = 560;
const HEIGHT = 200;
const PAD = { bottom: 26, left: 30, right: 8, top: 12 };
const BAR_GAP = 2;

export function ScoreDistributionChart({
  buckets,
  passingPercentage,
}: {
  buckets: AdminDashboard["scoreDistribution"];
  passingPercentage: number | null;
}) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  if (total === 0) {
    return (
      <Panel
        title="Score distribution"
        description="Submitted attempts, grouped into ten-point bands"
      >
        <EmptyPlot message="No submitted attempts yet." />
      </Panel>
    );
  }

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count));
  // Round the axis up to something readable rather than the raw max.
  const axisMax = Math.max(1, Math.ceil(maxCount / 2) * 2);
  const bandWidth = plotWidth / buckets.length;
  const barWidth = bandWidth - BAR_GAP;
  const ticks = [0, axisMax / 2, axisMax];
  const passX =
    passingPercentage === null
      ? null
      : PAD.left + (passingPercentage / 100) * plotWidth;

  return (
    <Panel
      title="Score distribution"
      description={`${total} submitted ${total === 1 ? "attempt" : "attempts"}, grouped into ten-point bands`}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Score distribution across ${buckets.length} bands. ${buckets
          .filter((bucket) => bucket.count > 0)
          .map(
            (bucket) =>
              `${bucket.rangeStart} to ${bucket.rangeEnd} percent: ${bucket.count}`,
          )
          .join("; ")}.`}
      >
        {ticks.map((tick) => {
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

        {passX !== null ? (
          <g>
            <line
              x1={passX}
              x2={passX}
              y1={PAD.top - 4}
              y2={PAD.top + plotHeight}
              stroke={VIZ.muted}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={passX + 4}
              y={PAD.top + 4}
              fontSize={9}
              fill={VIZ.muted}
            >
              Pass {passingPercentage}%
            </text>
          </g>
        ) : null}

        {buckets.map((bucket, index) => {
          const barHeight =
            bucket.count === 0 ? 0 : (bucket.count / axisMax) * plotHeight;
          const x = PAD.left + index * bandWidth + BAR_GAP / 2;
          const y = PAD.top + plotHeight - barHeight;

          return (
            <g key={bucket.bucket}>
              {bucket.count > 0 ? (
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
                    {`${bucket.rangeStart}–${bucket.rangeEnd}%: ${bucket.count} ${
                      bucket.count === 1 ? "candidate" : "candidates"
                    }`}
                  </title>
                </rect>
              ) : null}
              {index % 2 === 0 ? (
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fill={VIZ.muted}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {bucket.rangeStart}
                </text>
              ) : null}
            </g>
          );
        })}
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 8}
          textAnchor="end"
          fontSize={9}
          fill={VIZ.muted}
        >
          score %
        </text>
      </svg>
    </Panel>
  );
}
