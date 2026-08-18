import "server-only";

import { crc32, deflateRawSync } from "node:zlib";

// Writes a real .xlsx — typed cells, a frozen bold header, filters and column
// widths — rather than a CSV renamed. Same reasoning as the reader: the format
// is a zip of a few XML parts, so it needs no dependency.

export type ColumnType = "date" | "number" | "percent" | "text";

export type SheetColumn = {
  header: string;
  key: string;
  type?: ColumnType;
  width?: number;
};

export type Sheet = {
  columns: SheetColumn[];
  name: string;
  rows: Record<string, unknown>[];
};

// Style slots defined in STYLES_XML below.
const STYLE = { date: 2, decimal: 3, header: 1, integer: 4 } as const;

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const MILLISECONDS_PER_DAY = 86_400_000;

function escapeXml(value: string) {
  return (
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      // Control characters are illegal in XML 1.0, and Excel rejects the file
      // rather than skipping them.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  );
}

function columnName(index: number) {
  let name = "";

  for (let n = index + 1; n > 0; ) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - remainder) / 26);
  }

  return name;
}

function excelSerial(value: Date) {
  return (value.getTime() - EXCEL_EPOCH_UTC) / MILLISECONDS_PER_DAY;
}

function cellXml(reference: string, value: unknown, type: ColumnType) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (type === "date") {
    const date = value instanceof Date ? value : new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
    }

    return `<c r="${reference}" s="${STYLE.date}"><v>${excelSerial(date)}</v></c>`;
  }

  if (type === "number" || type === "percent") {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return "";
    }

    const style =
      type === "number" && Number.isInteger(numeric) ? STYLE.integer : STYLE.decimal;

    return `<c r="${reference}" s="${style}"><v>${numeric}</v></c>`;
  }

  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
    String(value),
  )}</t></is></c>`;
}

function sheetXml({ columns, rows }: Sheet) {
  const lastColumn = columnName(Math.max(0, columns.length - 1));
  const cols = columns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${column.width ?? 18}" customWidth="1"/>`,
    )
    .join("");

  const headerRow = `<row r="1" ht="20" customHeight="1">${columns
    .map(
      (column, index) =>
        `<c r="${columnName(index)}1" s="${STYLE.header}" t="inlineStr"><is><t>${escapeXml(
          column.header,
        )}</t></is></c>`,
    )
    .join("")}</row>`;

  const bodyRows = rows
    .map((row, rowIndex) => {
      const cells = columns
        .map((column, index) =>
          cellXml(
            `${columnName(index)}${rowIndex + 2}`,
            row[column.key],
            column.type ?? "text",
          ),
        )
        .join("");

      return `<row r="${rowIndex + 2}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${headerRow}${bodyRows}</sheetData><autoFilter ref="A1:${lastColumn}${rows.length + 1}"/></worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd\\ hh:mm"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFF1F4"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFCBD2DA"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`;

function zip(files: { data: string; name: string }[]) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const raw = Buffer.from(file.data, "utf8");
    const compressed = deflateRawSync(raw);
    const checksum = crc32(raw);

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(0, 10); // modified time and date stay at zero
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(raw.length, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);

    local.push(header, name, compressed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(0, 12);
    entry.writeUInt32LE(checksum, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(raw.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(0, 38);
    entry.writeUInt32LE(offset, 42);

    central.push(entry, name);
    offset += header.length + name.length + compressed.length;
  }

  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...local, centralBuffer, end]);
}

/** Excel refuses duplicate or illegally punctuated sheet names. */
function sheetName(name: string, index: number, taken: Set<string>) {
  const cleaned =
    name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || `Sheet${index + 1}`;
  let unique = cleaned;
  let suffix = 2;

  while (taken.has(unique.toLowerCase())) {
    unique = `${cleaned.slice(0, 28)} ${suffix}`;
    suffix += 1;
  }

  taken.add(unique.toLowerCase());

  return unique;
}

export function buildWorkbook(sheets: Sheet[]) {
  const taken = new Set<string>();
  const named = sheets.map((sheet, index) => ({
    ...sheet,
    name: sheetName(sheet.name, index, taken),
  }));

  const files = [
    {
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${named
        .map(
          (_, index) =>
            `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        )
        .join("")}</Types>`,
      name: "[Content_Types].xml",
    },
    {
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      name: "_rels/.rels",
    },
    {
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${named
        .map(
          (sheet, index) =>
            `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
        )
        .join("")}</sheets></workbook>`,
      name: "xl/workbook.xml",
    },
    {
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${named
        .map(
          (_, index) =>
            `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
        )
        .join("")}<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      name: "xl/_rels/workbook.xml.rels",
    },
    { data: STYLES_XML, name: "xl/styles.xml" },
    ...named.map((sheet, index) => ({
      data: sheetXml(sheet),
      name: `xl/worksheets/sheet${index + 1}.xml`,
    })),
  ];

  return zip(files);
}
