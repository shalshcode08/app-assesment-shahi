import "server-only";

import { inflateRawSync } from "node:zlib";

// A .xlsx file is a ZIP of XML parts. Node ships the inflate half of that
// (zlib) but no ZIP reader, and the sheets we need are two well-known entries,
// so the archive is walked directly instead of adding a spreadsheet dependency
// with a supply chain to review. Mirrors scripts/import-question-bank.py.

const SIGNATURE_CENTRAL_DIRECTORY = 0x02014b50;
const SIGNATURE_END_OF_DIRECTORY = 0x06054b50;
const SIGNATURE_ZIP64_END_LOCATOR = 0x07064b50;

type ZipEntry = { compressionMethod: number; localHeaderOffset: number; size: number };

function findEndOfDirectory(buffer: Buffer) {
  // The trailer holds a variable-length comment, so scan back for its signature.
  const earliest = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= earliest; offset -= 1) {
    if (buffer.readUInt32LE(offset) === SIGNATURE_END_OF_DIRECTORY) {
      return offset;
    }
  }

  return -1;
}

function readCentralDirectory(buffer: Buffer) {
  const end = findEndOfDirectory(buffer);

  if (end < 0) {
    throw new Error("NOT_A_WORKBOOK");
  }

  if (buffer.readUInt32LE(Math.max(0, end - 20)) === SIGNATURE_ZIP64_END_LOCATOR) {
    // Only produced by archives past the 4GB/65535-entry limits; a question
    // workbook is never one, so refuse rather than half-support the format.
    throw new Error("UNSUPPORTED_WORKBOOK");
  }

  const entries = new Map<string, ZipEntry>();
  let offset = buffer.readUInt32LE(end + 16);
  const count = buffer.readUInt16LE(end + 10);

  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== SIGNATURE_CENTRAL_DIRECTORY) {
      throw new Error("NOT_A_WORKBOOK");
    }

    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);

    entries.set(name, {
      compressionMethod: buffer.readUInt16LE(offset + 10),
      localHeaderOffset: buffer.readUInt32LE(offset + 42),
      size: buffer.readUInt32LE(offset + 20),
    });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function readEntry(buffer: Buffer, entry: ZipEntry) {
  const header = entry.localHeaderOffset;
  const nameLength = buffer.readUInt16LE(header + 26);
  const extraLength = buffer.readUInt16LE(header + 28);
  const start = header + 30 + nameLength + extraLength;
  const raw = buffer.subarray(start, start + entry.size);

  if (entry.compressionMethod === 0) {
    return raw.toString("utf8");
  }

  if (entry.compressionMethod === 8) {
    return inflateRawSync(raw).toString("utf8");
  }

  throw new Error("UNSUPPORTED_WORKBOOK");
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

function decodeXmlText(value: string) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return XML_ENTITIES[entity] ?? match;
  });
}

// Collects the text of every <t> element, which is how both shared strings and
// inline strings store their runs.
function textRunsOf(xml: string) {
  let text = "";

  for (const match of xml.matchAll(/<t(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/t>)/g)) {
    text += decodeXmlText(match[1] ?? "");
  }

  return text;
}

function readSharedStrings(xml: string | null) {
  if (!xml) {
    return [];
  }

  return Array.from(xml.matchAll(/<si(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/si>)/g), (match) =>
    textRunsOf(match[1] ?? ""),
  );
}

function columnIndexOf(reference: string) {
  const letters = /^([A-Z]+)/.exec(reference)?.[1];

  if (!letters) {
    return -1;
  }

  return letters
    .split("")
    .reduce((total, letter) => total * 26 + (letter.charCodeAt(0) - 64), 0) - 1;
}

export const FORMULA_MARKER = "<FORMULA>";

function cellValue(cell: string, sharedStrings: string[]) {
  // The contract rejects formulas where a plain value is expected, so they are
  // marked rather than silently read as their cached result.
  if (/<f(\s[^>]*)?(\/>|>)/.test(cell)) {
    return FORMULA_MARKER;
  }

  const type = /\st="([^"]+)"/.exec(cell)?.[1];

  if (type === "inlineStr") {
    return textRunsOf(cell);
  }

  const value = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(cell)?.[1];

  if (value === undefined) {
    return type === "str" ? textRunsOf(cell) : "";
  }

  if (type === "s") {
    return sharedStrings[Number.parseInt(value, 10)] ?? "";
  }

  return decodeXmlText(value);
}

function readSheet(xml: string, sharedStrings: string[]) {
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const cells = new Map<number, string>();

    for (const cellMatch of (rowMatch[1] ?? "").matchAll(
      /<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const reference = /r="([A-Z]+\d+)"/.exec(cellMatch[1])?.[1];
      const index = reference ? columnIndexOf(reference) : -1;

      if (index < 0) {
        continue;
      }

      const value = cellValue(`<c ${cellMatch[1]}>${cellMatch[2] ?? ""}</c>`, sharedStrings).trim();

      if (value) {
        cells.set(index, value);
      }
    }

    if (cells.size > 0) {
      const width = Math.max(...cells.keys()) + 1;
      rows.push(Array.from({ length: width }, (_, index) => cells.get(index) ?? ""));
    }
  }

  return rows;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());

  return cells;
}

function readCsv(text: string) {
  const rows: string[][] = [];
  let line = "";
  let quoted = false;

  for (const character of text.replace(/\r\n?/g, "\n")) {
    if (character === '"') {
      quoted = !quoted;
    }

    if (character === "\n" && !quoted) {
      if (line.trim()) rows.push(splitCsvLine(line));
      line = "";
      continue;
    }

    line += character;
  }

  if (line.trim()) {
    rows.push(splitCsvLine(line));
  }

  return rows;
}

/** Reads the first worksheet of an .xlsx file, or a .csv, as rows of strings. */
export function readWorkbookRows(file: Buffer, fileName: string) {
  if (/\.csv$/i.test(fileName)) {
    return readCsv(file.toString("utf8"));
  }

  const entries = readCentralDirectory(file);
  const sheetNames = Array.from(entries.keys())
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort();

  if (sheetNames.length === 0) {
    throw new Error("NOT_A_WORKBOOK");
  }

  const sharedEntry = entries.get("xl/sharedStrings.xml");
  const sharedStrings = readSharedStrings(sharedEntry ? readEntry(file, sharedEntry) : null);

  return readSheet(readEntry(file, entries.get(sheetNames[0])!), sharedStrings);
}
