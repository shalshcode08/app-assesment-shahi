#!/usr/bin/env python3
"""Validate a question workbook and emit SQL for the question bank.

Implements the contract in docs/question-bank-import.md. The workbook is
rejected as a unit: if any row fails, no SQL is written.

Uses only the standard library so the import path needs no extra dependency
and no npm supply-chain review.

Usage:
    python3 scripts/import-question-bank.py <workbook.xlsx> \
        --assessment-version-id <uuid> [--out import.sql] [--replace]
"""

import argparse
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

OPTION_CODES = ("A", "B", "C", "D")
CODE_PREFIX = "GMQ"
DEFAULT_MARKS = "1"
MINIMUM_ACTIVE_QUESTIONS = 50  # assessment_versions.questions_per_attempt

# Workbook column heading -> contract field. The source sheet uses its own
# names; map here rather than editing the spreadsheet by hand.
COLUMN_MAP = {
    "question no.": "code",
    "question code": "code",
    "question": "question",
    "option a": "option_a",
    "option b": "option_b",
    "option c": "option_c",
    "option d": "option_d",
    "correct answer": "correct",
    "correct option": "correct",
    "marks": "marks",
    "category": "category",
    "difficulty": "difficulty",
    "explanation": "explanation",
    "active": "active",
}

REQUIRED_FIELDS = ("code", "question", "option_a", "option_b", "option_c", "option_d", "correct")


def col_index(ref):
    letters = re.match(r"([A-Z]+)", ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_sheet(path):
    """Return the first worksheet as a list of row lists."""
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall(f"{NS}si"):
            shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))

    names = sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n))
    if not names:
        raise SystemExit("No worksheet found in workbook.")

    root = ET.fromstring(z.read(names[0]))
    rows = []
    for row in root.iter(f"{NS}row"):
        cells = {}
        for c in row.findall(f"{NS}c"):
            ctype = c.get("t")
            formula = c.find(f"{NS}f")
            v = c.find(f"{NS}v")
            inline = c.find(f"{NS}is")
            if formula is not None:
                # The contract rejects formulas where plain values are expected.
                val = f"<FORMULA:{formula.text}>"
            elif ctype == "s" and v is not None:
                val = shared[int(v.text)]
            elif ctype == "inlineStr" and inline is not None:
                val = "".join(t.text or "" for t in inline.iter(f"{NS}t"))
            elif v is not None:
                val = v.text
            else:
                val = ""
            cells[col_index(c.get("r"))] = (val or "").strip()
        if cells:
            rows.append([cells.get(i, "") for i in range(max(cells) + 1)])
    return rows


def parse(rows):
    """Map the header row, then return (questions, errors)."""
    if not rows:
        return [], ["Workbook is empty."]

    header = rows[0]
    positions = {}
    unknown = []
    for i, name in enumerate(header):
        key = COLUMN_MAP.get(name.strip().lower())
        if key:
            positions.setdefault(key, i)
        elif name.strip():
            unknown.append(name)

    errors = []
    missing = [f for f in REQUIRED_FIELDS if f not in positions]
    if missing:
        errors.append(f"Workbook is missing required columns: {', '.join(missing)}")
        return [], errors
    if unknown:
        errors.append(f"Unrecognised columns (ignored): {', '.join(unknown)}")

    def cell(row, key):
        i = positions.get(key)
        return row[i].strip() if i is not None and i < len(row) else ""

    questions = []
    seen_codes = {}
    for n, row in enumerate(rows[1:], start=2):
        if not any(c.strip() for c in row):
            continue

        raw_code = cell(row, "code")
        # A bare sequence number becomes a stable zero-padded external code.
        if raw_code.isdigit():
            code = f"{CODE_PREFIX}-{int(raw_code):03d}"
        else:
            code = raw_code

        q = {
            "row": n,
            "code": code,
            "question": cell(row, "question"),
            "options": [cell(row, f"option_{c.lower()}") for c in OPTION_CODES],
            "correct": cell(row, "correct").upper(),
            "marks": cell(row, "marks") or DEFAULT_MARKS,
            "category": cell(row, "category"),
            "difficulty": cell(row, "difficulty").lower(),
            "explanation": cell(row, "explanation"),
            "active": (cell(row, "active") or "yes").lower(),
        }

        problems = []
        joined = " ".join([q["code"], q["question"], *q["options"], q["correct"]])
        if "<FORMULA:" in joined:
            problems.append("contains a spreadsheet formula where a plain value is expected")

        if not q["code"]:
            problems.append("missing question code")
        elif q["code"] in seen_codes:
            problems.append(f"duplicate question code {q['code']} (also row {seen_codes[q['code']]})")
        else:
            seen_codes[q["code"]] = n

        if not q["question"]:
            problems.append("blank question text")

        blank = [c for c, text in zip(OPTION_CODES, q["options"]) if not text]
        if blank:
            problems.append(f"blank Option {', '.join(blank)}")

        lowered = [o.lower() for o in q["options"] if o]
        if len(set(lowered)) != len(lowered):
            problems.append("duplicate option text within the question")

        if q["correct"] not in OPTION_CODES:
            problems.append(f"correct answer {q['correct'] or '(blank)'} is not one of A-D")

        try:
            if float(q["marks"]) <= 0:
                problems.append("marks must be positive")
        except ValueError:
            problems.append(f"marks {q['marks']!r} is not a number")

        if q["difficulty"] and q["difficulty"] not in ("easy", "medium", "hard"):
            problems.append(f"unsupported difficulty {q['difficulty']!r}")

        if q["active"] not in ("yes", "no"):
            problems.append("active must be yes or no")

        q["problems"] = problems
        questions.append(q)

    return questions, errors


def lit(value):
    if value is None or value == "":
        return "null"
    return "'" + value.replace("'", "''") + "'"


def emit(questions, version_id, replace):
    out = [
        "-- Generated by scripts/import-question-bank.py -- do not edit by hand.",
        "-- Run as the postgres role (SQL Editor); service_role has no insert grant here.",
        "",
    ]
    if replace:
        out += [
            "delete from private.question_answer_keys",
            "where question_id in (",
            f"  select id from public.questions where assessment_version_id = {lit(version_id)}",
            ");",
            f"delete from public.question_options where question_id in (",
            f"  select id from public.questions where assessment_version_id = {lit(version_id)}",
            ");",
            f"delete from public.questions where assessment_version_id = {lit(version_id)};",
            "",
        ]

    for q in questions:
        values = ",\n".join(
            f"      ({lit(code)}, {lit(text)}, {i + 1})"
            for i, (code, text) in enumerate(zip(OPTION_CODES, q["options"]))
        )
        out.append(
            f"""with q as (
  insert into public.questions (
    assessment_version_id, external_code, question_text, marks,
    category, difficulty, explanation, is_active
  )
  values (
    {lit(version_id)}, {lit(q['code'])}, {lit(q['question'])}, {q['marks']},
    {lit(q['category'])}, {lit(q['difficulty'])}, {lit(q['explanation'])}, {str(q['active'] == 'yes').lower()}
  )
  returning id
), o as (
  insert into public.question_options (question_id, option_code, option_text, display_order)
  select q.id, v.code, v.text, v.ord
  from q
  cross join (
    values
{values}
  ) as v(code, text, ord)
  returning id, question_id, option_code
)
insert into private.question_answer_keys (question_id, correct_option_id)
select o.question_id, o.id from o where o.option_code = {lit(q['correct'])};"""
        )
        out.append("")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("workbook")
    ap.add_argument("--assessment-version-id", required=True)
    ap.add_argument("--out")
    ap.add_argument("--replace", action="store_true",
                    help="clear existing questions for this version first")
    ap.add_argument("--skip-invalid", action="store_true",
                    help="import the valid rows instead of rejecting the workbook as a unit")
    args = ap.parse_args()

    questions, errors = parse(read_sheet(args.workbook))
    bad = [q for q in questions if q["problems"]]
    good = [q for q in questions if not q["problems"]]

    for q in bad:
        for p in q["problems"]:
            line = f"  - row {q['row']} ({q['code'] or '?'}): {p}"
            print(line, file=sys.stderr)

    if bad and not args.skip_invalid:
        errors.append(f"{len(bad)} invalid row(s); pass --skip-invalid to import the rest")

    active = [q for q in good if q["active"] == "yes"]
    if len(active) < MINIMUM_ACTIVE_QUESTIONS:
        errors.append(
            f"Only {len(active)} valid active questions; at least {MINIMUM_ACTIVE_QUESTIONS} are "
            "required to build an attempt."
        )

    if errors:
        print(f"Rejected: {len(errors)} problem(s).", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    if bad:
        print(f"Skipping {len(bad)} invalid row(s): "
              f"{', '.join(q['code'] or str(q['row']) for q in bad)}", file=sys.stderr)

    sql = emit(good, args.assessment_version_id, args.replace)
    if args.out:
        with open(args.out, "w") as fh:
            fh.write(sql)
        print(f"{len(good)} of {len(questions)} questions validated -> {args.out}")
    else:
        print(sql)
    return 0


if __name__ == "__main__":
    sys.exit(main())
