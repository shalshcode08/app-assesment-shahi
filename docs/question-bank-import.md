# Question bank import contract

The question workbook should have one header row and one question per subsequent row.

Two paths load a workbook, and both enforce the contract below:

- **Admin UI** — `/admin/settings?tab=tests` → a test → **Questions**. Choosing a
  file parses it in the app (`features/admin/lib/`) and shows what would be
  created — count, the first few questions with their answer marked, and any rows
  that would be skipped — before an explicit **Import** writes it through the
  `import_admin_question_bank` RPC in one transaction. Accepts `.xlsx` and `.csv`
  up to 5 MB; the first worksheet is read. The admin picks nothing else: a
  re-upload replaces the bank while no trainer has answered from it, and adds to
  it afterwards.
- **Offline adapter** — `scripts/import-question-bank.py`, which emits SQL to run
  in the dashboard SQL Editor. Use it for bulk loads that predate a test row.

| Column | Required | Accepted value |
|---|---:|---|
| `Question Code` | Yes | Unique stable code such as `TRN-001`. A bare number becomes `Q-001`. Also accepted as `Question No.` |
| `Question` | Yes | Plain question text |
| `Option A` | Yes | Plain option text |
| `Option B` | Yes | Plain option text |
| `Option C` | Yes | Plain option text |
| `Option D` | Yes | Plain option text |
| `Correct Option` | Yes | `A`, `B`, `C`, or `D`. Also accepted as `Correct Answer` |
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
- Spreadsheet formulas where plain values are expected.

The offline adapter also rejects a workbook with fewer active, scorable questions
than the 50-question attempt size. The admin UI checks that count at publish time
instead, against the test's own `questions per candidate` setting, so a bank can
be built up across several uploads.

The admin UI normalises before it judges: headings are matched case- and
punctuation-insensitively across common spellings (`Question No.`, `Sr No.`,
`Ques`, `Ans`, `Option 1`…), stray line breaks and doubled spaces are collapsed,
and the answer column accepts `C`, `c.`, `(C)`, `Option C`, a 1-4 position, or
the full text of the correct option. It then imports the rows that pass and lists
the ones it skipped, with the reason for each — real workbooks arrive with a few damaged rows, and
refusing the whole file over them helps nobody. The offline adapter keeps its
stricter all-or-nothing default and its `--skip-invalid` flag.

Uploading into a test that has already served questions to trainers can only add
to the bank, never replace it.

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
