# Question bank import contract

The question workbook should have one header row and one question per subsequent row.

Workbooks are loaded in one place: `/admin/settings?tab=tests` → a test →
**Questions**. Choosing a file parses it in the app (`features/admin/lib/`) and
shows what would be created — the count, the first few questions with their
answer marked, and any rows that would be skipped — before an explicit
**Import** writes it through the `import_admin_question_bank` RPC in one
transaction. It accepts `.xlsx` and `.csv` up to 4 MB and reads the first
worksheet. The admin picks nothing else: a re-upload replaces the bank while no
trainer has answered from it, and adds to it afterwards.

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

A row is skipped, and reported with its reason, when it has:

- A missing or duplicate question code.
- Blank question text, or a blank option.
- A correct answer that names no option.
- Two options with the same text.
- Zero, negative, or unreadable marks.
- An unsupported difficulty.
- A spreadsheet formula where a plain value is expected.

The count of ready questions is checked at publish time, against the test's own
`questions per candidate` setting, so a bank can be built up across several
uploads.

The admin UI normalises before it judges: headings are matched case- and
punctuation-insensitively across common spellings (`Question No.`, `Sr No.`,
`Ques`, `Ans`, `Option 1`…), stray line breaks and doubled spaces are collapsed,
and the answer column accepts `C`, `c.`, `(C)`, `Option C`, a 1-4 position, or
the full text of the correct option. It then imports the rows that pass and lists
the ones it skipped, with the reason for each — real workbooks arrive with a few
damaged rows, and refusing the whole file over them helps nobody.

Uploading into a test that has already served questions to trainers can only add
to the bank, never replace it.

## Translated sheets

A test can be offered in more than one language. In `/admin/settings?tab=tests`
→ a test → **Languages**, the admin names the language and uploads the same
sheet translated.

The translated sheet uses the same columns as the original. Two of them must
match the original exactly:

- `Question No.` — how a translated row finds the question it belongs to.
- `Correct Answer` — the same letter as the original. A different letter means
  the options were reordered, so the letters no longer name the same answers,
  and the row is reported instead of imported.

`Question` and `Option A`–`D` carry the translated text. Marks, category,
difficulty, and the answer key are never read from a translated sheet; they stay
on the original question. Rows naming a question number the test does not have
are reported by code after the upload.

Removing a language deletes its translations and leaves the original questions
untouched.
