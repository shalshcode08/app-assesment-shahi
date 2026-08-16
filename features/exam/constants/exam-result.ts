const correctOptionIds: Readonly<Record<number, string>> = {
  1: "b",
  2: "c",
  3: "c",
  4: "c",
  5: "c",
  6: "b",
  7: "c",
  8: "c",
  9: "b",
  10: "b",
};

const selectedOptionIds: Readonly<Record<number, string>> = {
  1: "b",
  2: "c",
  3: "a",
  4: "c",
  5: "c",
  6: "b",
  7: "c",
  8: "b",
  9: "b",
  10: "b",
};

export const EXAM_RESULT = {
  durationSeconds: 24 * 60 + 18,
  passingPercentage: 70,
  tabSwitchWarnings: 1,
  correctOptionIds,
  selectedOptionIds,
} as const;
