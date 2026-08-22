import { EncodingType, File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type GradeColumnType =
  | "student"
  | "score"
  | "category"
  | "final"
  | "letter";

export type GradeExportFormatChoice = "pdf" | "excel" | "csv";

/** The report payload built by the consuming screen and passed to the exports. */
export type GradeExportData = {
  /** Name of the class. */
  className: string;
  /** Human readable timestamp shown in the report. */
  generatedAt: string;
  /** Display header for every column. Must align with `rows`. */
  headers: string[];
  /** Style hint for every column. Must align with `headers`. */
  columnTypes: GradeColumnType[];
  /** Row values aligned with `headers`. `null` means empty cell. */
  rows: (string | number | null)[][];
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeFileName(name: string): string {
  // Keep letters, numbers, dash, underscore and spaces; replace anything else.
  return (
    name
      .replace(/[^a-zA-Z0-9\-_ ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "grades"
  );
}

function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Column letter for a 0-based index (A, B, ... Z, AA, AB ...). */
function colName(index: number): string {
  let out = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Format a percentage number (0-100) for display inside tables/CSV. */
function formatPercent(value: number | null): string {
  if (value == null) return "";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

function displayCell(
  value: string | number | null,
  type: GradeColumnType,
): string {
  if (value === null || value === undefined) return "";
  if ((type === "category" || type === "final") && typeof value === "number") {
    return formatPercent(value);
  }
  return String(value);
}
// ---------------------------------------------------------------------------
// File writing + sharing
// ---------------------------------------------------------------------------

const MIME: Record<GradeExportFormatChoice, string> = {
  pdf: "application/pdf",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
};

const UTI: Partial<Record<GradeExportFormatChoice, string>> = {
  pdf: "com.adobe.pdf",
  excel: "org.openxmlformats.spreadsheetml.sheet",
  csv: "public.comma-separated-values-text",
};

/**
 * Writes content to a temp file in the cache dir and opens the system share
 * sheet, then removes the temp file regardless of the outcome.
 */
async function writeAndShare(
  format: GradeExportFormatChoice,
  rawName: string,
  content: string,
  encoding: EncodingType,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(
      "Sharing is not available on this device or platform. Export needs a native device.",
    );
  }

  const fileName = `${rawName}.${format}`;
  const file = new File(Paths.cache, fileName);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(content, { encoding });

  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: MIME[format],
      UTI: UTI[format],
      dialogTitle: "Export grades",
    });
  } finally {
    try {
      file.delete();
    } catch {
      // Ignore cleanup failures.
    }
  }
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value) || /^[\s]|[\s]$/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(data: GradeExportData): string {
  const lines: string[] = [];

  lines.push([data.className].map(escapeCsv).join(","));
  lines.push(["Generated", data.generatedAt].map(escapeCsv).join(","));
  lines.push("");

  lines.push(data.headers.map((h) => escapeCsv(h)).join(","));

  for (const row of data.rows) {
    lines.push(
      row
        .map((cell, ci) =>
          escapeCsv(displayCell(cell, data.columnTypes[ci] ?? "score")),
        )
        .join(","),
    );
  }

  // BOM so Excel opens UTF-8 special characters correctly.
  return `\uFEFF${lines.join("\r\n")}`;
}
// ---------------------------------------------------------------------------
// PDF (styled HTML table rendered by expo-print)
// ---------------------------------------------------------------------------

const ACCENT = "#1d4ed8";
const ACCENT_DARK = "#1e3a8a";
const BAND_FILL = "#eef4ff";
const FINAL_FILL = "#dbeafe";
const BORDER = "#93b4d3";

function buildPdfHtml(data: GradeExportData): string {
  const headerCells = data.headers
    .map((h) => `<th class="hdr">${escapeXml(h)}</th>`)
    .join("");

  const bodyRows = data.rows
    .map((row, ri) => {
      const banded = ri % 2 === 1;
      const tds = row
        .map((cell, ci) => {
          const type = data.columnTypes[ci] ?? "score";
          const isFinal = type === "final" || type === "letter";
          let base = "num";
          if (type === "student") base = "name";
          else if (isFinal) base = "final";
          else if (type === "category") base = "pct";
          const cls =
            banded && type !== "final" && type !== "letter"
              ? `${base} band`
              : base;
          return `<td class="${cls}">${escapeXml(displayCell(cell, type))}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
  .title { font-size: 20pt; font-weight: 700; color: ${ACCENT_DARK}; margin: 0 0 4pt 0; }
  .meta { font-size: 11pt; color: #6b7280; margin: 0 0 14pt 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 0.6pt solid ${BORDER}; padding: 5pt 7pt; font-size: 9.5pt; vertical-align: middle; }
  th.hdr {
    background: ${ACCENT}; color: #fff; font-weight: 700; text-align: center;
    text-transform: uppercase; letter-spacing: 0.04em; font-size: 8.5pt;
  }
  td.num { text-align: center; }
  td.band { background: ${BAND_FILL}; }
  td.pct { text-align: center; }
  td.pct.band { background: ${BAND_FILL}; }
  td.final { text-align: center; font-weight: 700; color: ${ACCENT_DARK}; background: ${FINAL_FILL}; }
  td.name { text-align: left; font-weight: 600; }
</style>
</head>
<body>
  <p class="title">${escapeXml(data.className)} — Grade Report</p>
  <p class="meta">Generated ${escapeXml(data.generatedAt)}</p>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}
// ---------------------------------------------------------------------------
// Excel (custom OOXML generator - fully styled, no external zip deps issues)
// ---------------------------------------------------------------------------

/**
 * Style helper mapping a column type (+ banding flag) to a cell style index.
 * Indices match the <cellXfs> table built below.
 */
const styleFor = (type: GradeColumnType, banded: boolean): number => {
  switch (type) {
    case "student":
      return banded ? 5 : 4;
    case "score":
      return banded ? 7 : 6;
    case "category":
      return banded ? 9 : 8;
    case "final":
      return 10;
    case "letter":
      return 11;
    default:
      return 0;
  }
};

/** A prebuilt <xf> element used as a tiny DSL to keep the styles.xml readable. */
const xf = (
  numFmtId: number,
  fontId: number,
  fillId: number,
  borderId: number,
  align: "center" | "left" | "right",
  applyNum: boolean,
) =>
  `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" ` +
  `xfId="0"${applyNum ? ' applyNumberFormat="1"' : ""} applyFont="1" applyFill="${fillId !== 0}" ` +
  `applyBorder="${borderId !== 0}" applyAlignment="1">` +
  `<alignment horizontal="${align}" vertical="center" wrapText="true"/></xf>`;

/** Builds a styled .xlsx workbook as a base64 string. */
async function buildXlsxBase64(data: GradeExportData): Promise<string> {
  const colCount = data.headers.length;
  const lastName = colName(colCount - 1);
  const headerRow = 3; // rows 1 (title), 2 (subtitle), 3 (header)

  // Number formats - add "0.0%" as a custom numFmtId 164.
  const numFmts = `<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts>`;

  const fonts =
    `<fonts count="5">` +
    // 0 - default
    `<font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>` +
    // 1 - title (bold, larger, accent)
    `<font><b/><sz val="15"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font>` +
    // 2 - subtitle (gray)
    `<font><sz val="11"/><color rgb="FF6B7280"/><name val="Calibri"/></font>` +
    // 3 - header (white bold)
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
    // 4 - body bold (final / letter)
    `<font><b/><sz val="11"/><color rgb="FF1E40AF"/><name val="Calibri"/></font>` +
    `</fonts>`;

  const fills =
    `<fills count="5">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFEDF3FF"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/><bgColor indexed="64"/></patternFill></fill>` +
    `</fills>`;

  const borderThin =
    `<border><left style="thin"><color rgb="FF93B4D3"/></left>` +
    `<right style="thin"><color rgb="FF93B4D3"/></right>` +
    `<top style="thin"><color rgb="FF93B4D3"/></top>` +
    `<bottom style="thin"><color rgb="FF93B4D3"/></bottom><diagonal/></border>`;

  const borders =
    `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>` +
    borderThin +
    `</borders>`;

  const cellXfs =
    `<cellXfs count="12">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    xf(0, 1, 0, 0, "left", false) + //  1 title
    xf(0, 2, 0, 0, "left", false) + //  2 subtitle
    xf(0, 3, 2, 1, "center", false) + // 3 header
    xf(0, 0, 0, 1, "left", false) + //   4 name
    xf(0, 0, 3, 1, "left", false) + //   5 name band
    xf(0, 0, 0, 1, "center", false) + // 6 score
    xf(0, 0, 3, 1, "center", false) + // 7 score band
    xf(164, 0, 0, 1, "center", true) + // 8 category pct
    xf(164, 0, 3, 1, "center", true) + // 9 category pct band
    xf(164, 4, 4, 1, "center", true) + // 10 final pct
    xf(0, 4, 4, 1, "center", false) + //  11 letter
    `</cellXfs>`;

  const stylesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    numFmts +
    fonts +
    fills +
    borders +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    cellXfs +
    `</styleSheet>`;

  // ---- Worksheet ------------------------------------------------------------
  const cols = data.headers
    .map(
      (_h, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${data.columnTypes[i] === "student" ? 26 : 13}" customWidth="1"/>`,
    )
    .join("");

  const renderHeaderRow = () =>
    data.headers
      .map((h, i) => {
        const ref = `${colName(i)}${headerRow}`;
        return `<c r="${ref}" s="3" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`;
      })
      .join("");

  const renderDataRows = () => {
    let xml = "";
    data.rows.forEach((row, ri) => {
      const excelRow = headerRow + 1 + ri;
      const banded = ri % 2 === 1;
      const cells = row
        .map((cell, ci) => {
          const ref = `${colName(ci)}${excelRow}`;
          const type = data.columnTypes[ci] ?? "score";
          if (cell === null || cell === undefined || cell === "") {
            return `<c r="${ref}" s="${styleFor(type, banded)}"/>`;
          }
          if (
            (type === "category" || type === "final") &&
            typeof cell === "number"
          ) {
            // Store a fraction (0.0-1.0); the "0.0%" numFmt renders it.
            // Round to 4dp to avoid binary float artifacts (e.g. 0.80555000…1).
            const fraction = Math.round(cell * 100) / 10000;
            return `<c r="${ref}" s="${styleFor(type, banded)}"><v>${fraction}</v></c>`;
          }
          return `<c r="${ref}" s="${styleFor(type, banded)}" t="inlineStr"><is><t>${escapeXml(String(cell))}</t></is></c>`;
        })
        .join("");
      xml += `<row r="${excelRow}" ht="16" customHeight="1">${cells}</row>`;
    });
    return xml;
  };

  const titleCell = (value: string, style: number) =>
    `<c r="A1" s="${style}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
  const subtitleCell = (value: string) =>
    `<c r="A2" s="2" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;

  const sheetViews =
    `<sheetViews><sheetView workbookViewId="0">` +
    `<pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/>` +
    `<selection pane="bottomLeft" activeCell="A${headerRow + 1}" sqref="A${headerRow + 1}"/>` +
    `</sheetView></sheetViews>`;

  const worksheetXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    sheetViews +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${cols}</cols>` +
    `<sheetData>` +
    `<row r="1" ht="22" customHeight="1">${titleCell(`${data.className} — Grade Report`, 1)}</row>` +
    `<row r="2" ht="18" customHeight="1">${subtitleCell(`Generated ${data.generatedAt}`)}</row>` +
    `<row r="${headerRow}" ht="20" customHeight="1">${renderHeaderRow()}</row>` +
    renderDataRows() +
    `</sheetData>` +
    `<mergeCells count="2">` +
    `<mergeCell ref="A1:${lastName}1"/>` +
    `<mergeCell ref="A2:${lastName}2"/>` +
    `</mergeCells>` +
    `</worksheet>`;

  // ---- Package parts ---------------------------------------------------------
  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
    `</Types>`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
    `</Relationships>`;

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="Grades" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`;

  const workbookRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const coreProps =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
    `xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ` +
    `xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${escapeXml(data.className)} — Grade Report</dc:title>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>` +
    `</cp:coreProperties>`;

  const appProps =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ` +
    `xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">` +
    `<Application>Class Bridge</Application>` +
    `</Properties>`;

  // ---- Zip package ------------------------------------------------------------
  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.folder("_rels")!.file(".rels", rootRels);
  zip.folder("docProps")!.file("core.xml", coreProps);
  zip.folder("docProps")!.file("app.xml", appProps);
  zip.folder("xl")!.file("workbook.xml", workbookXml);
  zip.folder("xl/_rels")!.file("workbook.xml.rels", workbookRels);
  zip.folder("xl")!.file("styles.xml", stylesXml);
  zip.folder("xl/worksheets")!.file("sheet1.xml", worksheetXml);

  return zip.generateAsync({
    type: "base64",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Exports the grade report in the requested format and opens the system share
 * sheet so the teacher can send / print / store the file.
 *
 * @returns The generated file name (for confirmation toasts).
 */
export async function exportGradebook(
  format: GradeExportFormatChoice,
  data: GradeExportData,
): Promise<string> {
  const baseName = `${sanitizeFileName(data.className)}-grades-${todayStamp()}`;

  switch (format) {
    case "csv": {
      await writeAndShare(format, baseName, buildCsv(data), EncodingType.UTF8);
      return `${baseName}.csv`;
    }
    case "excel": {
      const base64 = await buildXlsxBase64(data);
      await writeAndShare(format, baseName, base64, EncodingType.Base64);
      return `${baseName}.xlsx`;
    }
    case "pdf": {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error(
          "Sharing is not available on this device or platform. Export needs a native device.",
        );
      }
      const { uri } = await Print.printToFileAsync({ html: buildPdfHtml(data) });
      await Sharing.shareAsync(uri, {
        mimeType: MIME.pdf,
        UTI: UTI.pdf,
        dialogTitle: "Export grades (PDF)",
      });
      return `${baseName}.pdf`;
    }
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}