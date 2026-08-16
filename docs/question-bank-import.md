# Question bank import contract

The question workbook should have one header row and one question per subsequent row.

| Column | Required | Accepted value |
|---|---:|---|
| `Question Code` | Yes | Unique stable code such as `TRN-001` |
| `Question` | Yes | Plain question text |
| `Option A` | Yes | Plain option text |
| `Option B` | Yes | Plain option text |
| `Option C` | Yes | Plain option text |
| `Option D` | Yes | Plain option text |
| `Correct Option` | Yes | `A`, `B`, `C`, or `D` |
| `Marks` | Yes | Positive number; currently expected to be `1` |
| `Category` | No | Reporting or future sampling category |
| `Difficulty` | No | `easy`, `medium`, or `hard` |
| `Explanation` | No | Explanation shown only after submission |
| `Active` | No | `yes` or `no`; defaults to `yes` |

## Import validation

The importer will reject the workbook as a unit when it contains:

- Missing or duplicate question codes.
- Blank questions or options.
- A correct option that does not exist.
- Duplicate option text within the same question.
- Zero, negative, or invalid marks.
- Unsupported difficulty values.
- Fewer active, scorable questions than the configured 50-question attempt size.
- Spreadsheet formulas where plain values are expected.

The approved source workbook should be attached to the project before implementing its adapter. Its real column names will be mapped to this contract rather than editing the source spreadsheet manually.

## Adapter

`scripts/import-question-bank.py` reads the workbook, validates it against the
contract above, and emits SQL. It uses only the Python standard library, so the
import path adds no npm dependency.

```bash
python3 scripts/import-question-bank.py <workbook.xlsx> \
  --assessment-version-id <uuid> --out import.sql
```

The generated SQL must be run as the `postgres` role (the dashboard SQL Editor).
`service_role` has no insert grant on `questions`, `question_options`, or
`private.question_answer_keys`, so the application key cannot load the bank.

Flags:

- `--replace` clears existing questions for that assessment version first. Without
  it, re-running fails on the `(assessment_version_id, external_code)` unique
  constraint.
- `--skip-invalid` imports the valid rows instead of rejecting the workbook as a
  unit. The rejected rows are still listed on stderr, and the 50-question minimum
  is enforced against the survivors.

### Garment Manufacturing workbook (100 questions)

Column mapping applied by the adapter:

| Workbook column | Contract field |
|---|---|
| `Question No.` | `Question Code`, zero-padded to `GMQ-001` |
| `Question` | `Question` |
| `Option A`–`Option D` | `Option A`–`Option D`, display order 1–4 |
| `Correct Answer` | `Correct Option` |

`Marks`, `Category`, `Difficulty`, `Explanation`, and `Active` are absent from
this workbook and take the contract defaults (marks `1`, active `yes`, the rest
null).

Four rows are damaged at source and were imported with `--skip-invalid`:

- `GMQ-011` — Options A and B are blank; their text is appended to the question
  text instead.
- `GMQ-012` — no correct answer.
- `GMQ-018` — Option A is blank and the text is not recoverable from the file.
- `GMQ-025` — Option C is blank; Option B holds `Class 301 C.Class 504`.

Fix these in the workbook and re-run with `--replace` to load all 100.
