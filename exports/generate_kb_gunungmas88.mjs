import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, PageBreak
} from "docx";
import { readFileSync } from "fs";
import { writeFileSync } from "fs";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

// ─── Fetch data ───────────────────────────────────────────────────────────────
const merchantIds = ["m_0b477f8f380cb6d0", "m_4e614320ec03b602"];

const merchants = await query(`
  SELECT id, company_name, email, username, phone, website_url, created_at
  FROM merchants WHERE id = ANY($1)
`, [merchantIds]);

const agents = await query(`
  SELECT id, merchant_id, name, description, is_active, agent_type, created_at
  FROM agents WHERE merchant_id = ANY($1) ORDER BY merchant_id, name
`, [merchantIds]);

const knowledgeEntries = await query(`
  SELECT ke.id, ke.merchant_id, ke.agent_id, ke.name, ke.content,
         ke.is_active, ke.sort_order, ke.created_at, a.name as agent_name
  FROM knowledge_entries ke
  LEFT JOIN agents a ON ke.agent_id = a.id
  WHERE ke.merchant_id = ANY($1)
  ORDER BY ke.merchant_id, a.name, ke.sort_order
`, [merchantIds]);

const sources = await query(`
  SELECT s.id, s.merchant_id, s.name, s.type, s.source_subtype, s.url,
         s.content, s.is_active, s.char_count, s.created_at, a.name as agent_name
  FROM sources s
  LEFT JOIN agents a ON s.agent_id = a.id
  WHERE s.merchant_id = ANY($1)
  ORDER BY s.merchant_id, s.type, s.created_at
`, [merchantIds]);

await pool.end();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BRAND   = "1F3A93"; // dark blue
const ACCENT  = "2E75B6"; // mid blue
const LIGHT   = "D6E4F7"; // light blue
const GRAY    = "F2F2F2";
const BLACK   = "1A1A1A";
const GREEN   = "1E7E34";
const RED_C   = "C0392B";

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    shading: { type: ShadingType.SOLID, color: BRAND, fill: BRAND },
    children: [new TextRun({ text, color: "FFFFFF", bold: true, size: 28 })],
  });
}

function heading2(text) {
  return new Paragraph({
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, color: ACCENT })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ACCENT } },
  });
}

function heading3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, color: BLACK })],
  });
}

function label(text) {
  return new TextRun({ text: `${text}: `, bold: true, size: 20, color: BLACK });
}

function value(text) {
  return new TextRun({ text: String(text ?? "-"), size: 20, color: "444444" });
}

function para(...runs) {
  return new Paragraph({ spacing: { before: 60, after: 60 }, children: runs });
}

function divider() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" } },
  });
}

function badge(text, color) {
  return new TextRun({
    text: ` [${text}] `,
    bold: true,
    color,
    size: 18,
    highlight: color === GREEN ? "green" : color === RED_C ? "red" : "yellow",
  });
}

function contentBlock(text) {
  if (!text) return [];
  return text.split("\n").map(line =>
    new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text: line, size: 19, color: "333333", font: "Courier New" })],
    })
  );
}

function infoTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k, v]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
            children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 19 })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: String(v ?? "-"), size: 19 })] })],
          }),
        ],
      })
    ),
  });
}

// ─── Classify knowledge entries ───────────────────────────────────────────────
function classifyEntry(name, content) {
  const n = (name ?? "").toLowerCase();
  const c = (content ?? "").toLowerCase();
  if (n.includes("deposit") || n.includes("withdraw") || n.includes("wd") ||
      c.includes("deposit") && c.includes("withdraw")) return "Transaksi & Keuangan";
  if (n.includes("game") || c.includes("provider") || c.includes("slot") ||
      c.includes("casino") || c.includes("sportsbook")) return "Game & Provider";
  if (n.includes("sop") || n.includes("konteks") || n.includes("cs") ||
      c.includes("bosku") || c.includes("eskalasi") || c.includes("supervisor")) return "SOP Customer Service";
  if (n.includes("register") || n.includes("login") || n.includes("akun")) return "Akun & Registrasi";
  if (n.includes("crawl") || n.includes(".com") || c.includes("products & services")) return "Informasi Website (Crawl)";
  return "Umum";
}

// ─── Build document ───────────────────────────────────────────────────────────
const sections = [];
const children = [];

// Cover
children.push(
  new Paragraph({ spacing: { before: 1440, after: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "KNOWLEDGE BASE EXPORT", bold: true, size: 56, color: BRAND })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: "GUNUNGMAS88", bold: true, size: 40, color: ACCENT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: `Diekspor: ${new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}`, size: 22, color: "666666" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 1440 },
    children: [new TextRun({ text: "Dibuat otomatis oleh sistem Chatvice", size: 20, color: "999999", italics: true })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// For each merchant
for (const merchant of merchants) {
  const mId = merchant.id;
  const mName = merchant.company_name ?? "Gunungmas88";
  const mAgents = agents.filter(a => a.merchant_id === mId);
  const mEntries = knowledgeEntries.filter(e => e.merchant_id === mId);
  const mSources = sources.filter(s => s.merchant_id === mId);

  // ── Merchant header ──
  children.push(
    heading1(`AKUN: ${mName.toUpperCase()}`),
    divider(),
    heading2("1. Informasi Akun Merchant"),
    infoTable([
      ["Company Name", mName],
      ["Email", merchant.email],
      ["Username", merchant.username || "-"],
      ["Telepon", merchant.phone || "-"],
      ["Website", merchant.website_url || "-"],
      ["Terdaftar", merchant.created_at ? new Date(merchant.created_at).toLocaleDateString("id-ID") : "-"],
    ]),
  );

  // ── Agents ──
  children.push(
    heading2("2. Daftar AI Agent"),
  );
  if (mAgents.length === 0) {
    children.push(para(value("Tidak ada agent.")));
  } else {
    for (const ag of mAgents) {
      children.push(
        heading3(`Agent: ${ag.name}`),
        infoTable([
          ["Status", ag.is_active ? "Aktif" : "Tidak Aktif"],
          ["Tipe", ag.agent_type || "standard"],
          ["Deskripsi", ag.description || "-"],
        ]),
      );
    }
  }

  // ── Knowledge Entries by classification ──
  children.push(heading2("3. Knowledge Base (Training Data)"));

  if (mEntries.length === 0) {
    children.push(para(value("Tidak ada knowledge entry.")));
  } else {
    // Group by classification
    const groups = {};
    for (const e of mEntries) {
      const cls = classifyEntry(e.name, e.content);
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(e);
    }

    for (const [cls, entries] of Object.entries(groups)) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
          children: [
            new TextRun({ text: `  Kategori: ${cls}`, bold: true, size: 22, color: ACCENT }),
            new TextRun({ text: `  (${entries.length} entry)`, size: 19, color: "666666" }),
          ],
        }),
      );

      for (const entry of entries) {
        children.push(
          heading3(`[${entry.name}]`),
          infoTable([
            ["Agent", entry.agent_name || "(Semua Agent)"],
            ["Status", entry.is_active ? "Aktif" : "Nonaktif"],
            ["Dibuat", entry.created_at ? new Date(entry.created_at).toLocaleDateString("id-ID") : "-"],
          ]),
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [new TextRun({ text: "Isi Konten:", bold: true, size: 20 })],
          }),
          new Paragraph({
            spacing: { before: 0, after: 0 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 8, color: ACCENT },
            },
            children: [],
          }),
          ...contentBlock(entry.content),
          divider(),
        );
      }
    }
  }

  // ── Sources ──
  children.push(heading2("4. Active Sources (URL / File)"));

  if (mSources.length === 0) {
    children.push(para(value("Tidak ada source.")));
  } else {
    for (const src of mSources) {
      const typeLabel = src.source_subtype
        ? `${src.type.toUpperCase()} / ${src.source_subtype}`
        : src.type.toUpperCase();

      children.push(
        heading3(`[${src.name}]`),
        infoTable([
          ["Tipe", typeLabel],
          ["URL", src.url || "-"],
          ["Agent", src.agent_name || "(Semua Agent)"],
          ["Status", src.is_active ? "Aktif" : "Nonaktif"],
          ["Jumlah Karakter", src.char_count ? src.char_count.toLocaleString("id-ID") : "-"],
          ["Dibuat", src.created_at ? new Date(src.created_at).toLocaleDateString("id-ID") : "-"],
        ]),
      );

      if (src.content && src.content.length > 0) {
        const preview = src.content.slice(0, 3000) + (src.content.length > 3000 ? "\n\n[... konten dipotong, total " + src.char_count + " karakter ...]" : "");
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [new TextRun({ text: "Preview Konten:", bold: true, size: 20 })],
          }),
          ...contentBlock(preview),
        );
      }
      children.push(divider());
    }
  }

  // Page break between merchants
  if (merchant !== merchants[merchants.length - 1]) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }
}

// ─── Assemble & write ─────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Chatvice Platform",
  title: "Knowledge Base Export – Gunungmas88",
  description: "Exported knowledge base for merchant gunungmas88",
  sections: [{ children }],
});

const buffer = await Packer.toBuffer(doc);
const outPath = "exports/gunungmas88_knowledge_base.docx";
writeFileSync(outPath, buffer);
console.log("OK:" + outPath + " (" + Math.round(buffer.length / 1024) + " KB)");
