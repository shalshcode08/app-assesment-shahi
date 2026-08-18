import "server-only";

import { FORMULA_MARKER, readWorkbookRows } from "@/features/admin/lib/read-workbook";

// Implements the contract in docs/question-bank-import.md.

export const OPTION_CODES = ["A", "B", "C", "D"] as const;
const DEFAULT_CODE_PREFIX = "Q";
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const MAXIMUM_ROWS = 2000;

// Workbook heading (lowercased, punctuation stripped) -> contract field. The
// aliases exist so an admin never has to rename a column by hand.
const COLUMN_MAP: Record<string, string> = {
  a: "optionA",
  active: "active",
  ans: "correct",
  answer: "correct",
  b: "optionB",
  c: "optionC",
  category: "category",
  correct: "correct",
  "correct ans": "correct",
  "correct answer": "correct",
  "correct option": "correct",
  d: "optionD",
  difficulty: "difficulty",
  explanation: "explanation",
  marks: "marks",
  "option 1": "optionA",
  "option 2": "optionB",
  "option 3": "optionC",
  "option 4": "optionD",
  "option a": "optionA",
  "option b": "optionB",
  "option c": "optionC",
  "option d": "optionD",
  q: "question",
  "q no": "code",
  ques: "question",
  question: "question",
  "question code": "code",
  "question no": "code",
  "question text": "question",
  "s no": "code",
  "sl no": "code",
  "sr no": "code",
  topic: "category",
};

const REQUIRED_FIELDS = [
  "code",
  "question",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correct",
] as const;

export type ParsedQuestion = {
  active: boolean;
  category: string | null;
  code: string;
  correct: string;
  difficulty: string | null;
  explanation: string | null;
  marks: number;
  options: { code: string; text: string }[];
  question: string;
};

export type RejectedRow = { code: string; problems: string[]; row: number };

export type WorkbookParseResult = {
  errors: string[];
  questions: ParsedQuestion[];
  rejected: RejectedRow[];
  warnings: string[];
};

function normalizeHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[._#()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapses the stray line breaks and doubled spaces spreadsheets carry. */
function normalizeText(value: string) {
  return value.replace(/\s*\n\s*/g, " ").replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Reads whatever an admin put in the answer column: "C", "c.", "(C)",
 * "Option C", a 1-4 position, or the full text of the right option.
 */
function normalizeCorrect(raw: string, options: { code: string; text: string }[]) {
  const value = normalizeText(raw);

  if (!value) {
    return "";
  }

  const letter = /^(?:option\s*)?\(?([a-d])\)?[.):]?$/i.exec(value);

  if (letter) {
    return letter[1].toUpperCase();
  }

  const position = /^(?:option\s*)?([1-4])[.):]?$/i.exec(value);

  if (position) {
    return OPTION_CODES[Number(position[1]) - 1];
  }

  const match = options.find(
    (option) => option.text && option.text.toLowerCase() === value.toLowerCase(),
  );

  return match?.code ?? value.toUpperCase();
}

export function parseQuestionWorkbook(
  file: Buffer,
  fileName: string,
): WorkbookParseResult {
  const empty = { errors: [], questions: [], rejected: [], warnings: [] };
  let rows: string[][];

  try {
    rows = readWorkbookRows(file, fileName);
  } catch (error) {
    const reason =
      error instanceof Error && error.message === "UNSUPPORTED_WORKBOOK"
        ? "This workbook uses a format the importer cannot read. Re-save it as .xlsx or .csv."
        : "This file could not be read as a spreadsheet. Upload a .xlsx or .csv file.";

    return { ...empty, errors: [reason] };
  }

  if (rows.length === 0) {
    return { ...empty, errors: ["The sheet is empty."] };
  }

  if (rows.length - 1 > MAXIMUM_ROWS) {
    return {
      ...empty,
      errors: [`The sheet has more than ${MAXIMUM_ROWS} questions. Split it into smaller files.`],
    };
  }

  const positions: Record<string, number> = {};
  const unknown: string[] = [];

  rows[0].forEach((heading, index) => {
    const field = COLUMN_MAP[normalizeHeading(heading)];

    if (field) {
      positions[field] ??= index;
    } else if (heading.trim()) {
      unknown.push(heading.trim());
    }
  });

  const missing = REQUIRED_FIELDS.filter((field) => !(field in positions));

  if (missing.length > 0) {
    return {
      ...empty,
      errors: [
        `The sheet is missing these columns: ${missing
          .map((field) => HEADING_LABELS[field])
          .join(", ")}.`,
      ],
    };
  }

  const warnings =
    unknown.length > 0 ? [`Ignored unrecognised columns: ${unknown.join(", ")}.`] : [];

  const questions: ParsedQuestion[] = [];
  const rejected: RejectedRow[] = [];
  const seenCodes = new Map<string, number>();

  function cell(row: string[], field: string) {
    const index = positions[field];

    return index === undefined ? "" : normalizeText(row[index] ?? "");
  }

  rows.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;

    if (row.every((value) => !value.trim())) {
      return;
    }

    const rawCode = cell(row, "code");
    // A bare sequence number becomes a stable zero-padded external code. A
    // spreadsheet may hand the same number over as "7", "07" or "7.0"
    // depending on the cell format, and all three mean question seven.
    const sequence = /^0*(\d+)(?:\.0+)?$/.exec(rawCode);
    const code = sequence
      ? `${DEFAULT_CODE_PREFIX}-${sequence[1].padStart(3, "0")}`
      : rawCode;
    const options = OPTION_CODES.map((optionCode) => ({
      code: optionCode,
      text: cell(row, `option${optionCode}`),
    }));
    const correct = normalizeCorrect(cell(row, "correct"), options);
    const rawMarks = cell(row, "marks").replace(/[^\d.]/g, "") || "1";
    const difficulty = cell(row, "difficulty").toLowerCase();
    const active = (cell(row, "active") || "yes").toLowerCase();
    const isActive = ["yes", "y", "true", "1", "active"].includes(active);
    const problems: string[] = [];

    if ([code, cell(row, "question"), ...options.map((o) => o.text), correct].some((value) =>
      value.includes(FORMULA_MARKER),
    )) {
      problems.push("contains a formula where a plain value is expected");
    }

    if (!code) {
      problems.push("missing question code");
    } else if (seenCodes.has(code)) {
      problems.push(`duplicate question code ${code} (also row ${seenCodes.get(code)})`);
    } else {
      seenCodes.set(code, rowNumber);
    }

    if (!cell(row, "question")) {
      problems.push("blank question text");
    }

    const blank = options.filter((option) => !option.text).map((option) => option.code);

    if (blank.length > 0) {
      problems.push(`blank Option ${blank.join(", ")}`);
    }

    const filled = options.filter((option) => option.text).map((option) => option.text.toLowerCase());

    if (new Set(filled).size !== filled.length) {
      problems.push("two options have the same text");
    }

    if (!OPTION_CODES.includes(correct as (typeof OPTION_CODES)[number])) {
      problems.push(`correct answer ${correct || "(blank)"} is not one of A-D`);
    }

    const marks = Number(rawMarks);

    if (!Number.isFinite(marks) || marks <= 0) {
      problems.push(`marks ${rawMarks} is not a positive number`);
    }

    if (difficulty && !DIFFICULTIES.has(difficulty)) {
      problems.push(`unsupported difficulty ${difficulty}`);
    }

    if (!isActive && !["no", "n", "false", "0", "inactive"].includes(active)) {
      problems.push("active must be yes or no");
    }

    if (problems.length > 0) {
      rejected.push({ code: code || `Row ${rowNumber}`, problems, row: rowNumber });
      return;
    }

    questions.push({
      active: isActive,
      category: cell(row, "category") || null,
      code,
      correct,
      difficulty: difficulty || null,
      explanation: cell(row, "explanation") || null,
      marks,
      options,
      question: cell(row, "question"),
    });
  });

  if (questions.length === 0 && rejected.length === 0) {
    return { ...empty, errors: ["The sheet has a header but no question rows."], warnings };
  }

  return { errors: [], questions, rejected, warnings };
}

const HEADING_LABELS: Record<string, string> = {
  code: "Question Code",
  correct: "Correct Option",
  optionA: "Option A",
  optionB: "Option B",
  optionC: "Option C",
  optionD: "Option D",
  question: "Question",
};
