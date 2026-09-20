import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Branded PDF remittance advice / payment statement (Stretchy → payee). Pure JS
// (pdf-lib) so it runs in serverless. Returns raw PDF bytes.

const INK = rgb(0.078, 0.067, 0.059);   // #14110F
const OLIVE = rgb(0.443, 0.435, 0.224); // #716F39
const MUTE = rgb(0.42, 0.4, 0.38);

// Stretchy S logomark — fetched once from the hosted transparent PNG and cached.
let _logo: Uint8Array | null | undefined;
async function logoBytes(): Promise<Uint8Array | null> {
  if (_logo !== undefined) return _logo;
  try {
    const res = await fetch("https://www.stretchyyoga.co.nz/s-mark-black-v2.png");
    _logo = res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  } catch { _logo = null; }
  return _logo;
}

export interface RemittancePdfInput {
  payeeName: string;
  role: string;
  amount: number;        // dollars
  sessionTitle: string;
  dateStr: string;       // session date
  venue?: string | null;
  note?: string;
  reference?: string;    // our internal ref (short id)
  invoiceNo?: string;    // the contractor's own invoice number
}

export async function buildRemittancePdf(p: RemittancePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  const L = 56;                 // left margin
  const R = width - 56;         // right edge
  let y = 786;

  const text = (s: string, x: number, yy: number, size = 11, f = font, color = INK) =>
    page.drawText(s, { x, y: yy, size, font: f, color });
  const right = (s: string, xr: number, yy: number, size = 11, f = font, color = INK) =>
    page.drawText(s, { x: xr - f.widthOfTextAtSize(s, size), y: yy, size, font: f, color });

  // Header — S logomark + wordmark
  let wordmarkX = L;
  const logo = await logoBytes();
  if (logo) {
    try {
      const png = await doc.embedPng(logo);
      const lw = 26, lh = (png.height / png.width) * lw;
      page.drawImage(png, { x: L, y: y - 6, width: lw, height: lh });
      wordmarkX = L + lw + 10;
    } catch { /* fall back to wordmark only */ }
  }
  text("STRETCHY", wordmarkX, y, 22, bold, INK);
  right("REMITTANCE ADVICE", R, y + 3, 12, bold, OLIVE);
  right("Payment statement", R, y - 12, 9, font, MUTE);
  y -= 40;
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 1.5, color: INK });
  y -= 30;

  const issued = new Date().toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "long", year: "numeric" });
  text("Date issued", L, y, 9, bold, MUTE); text(issued, L, y - 14, 11);
  // Right column: the contractor's invoice number (what they asked to reference)
  // + our internal Stretchy ref beneath it.
  let ry = y;
  if (p.invoiceNo) { right("Invoice no. (contractor)", R, ry, 9, bold, MUTE); right(p.invoiceNo, R, ry - 14, 12, bold); ry -= 32; }
  if (p.reference) { right("Stretchy ref", R, ry, 9, bold, MUTE); right(p.reference, R, ry - 13, 10, font, MUTE); }
  y -= (p.invoiceNo && p.reference ? 60 : 44);

  text("PAID TO", L, y, 9, bold, MUTE);
  text(p.payeeName, L, y - 16, 14, bold);
  text(p.role, L, y - 32, 11, font, MUTE);
  y -= 62;

  text("FOR", L, y, 9, bold, MUTE);
  text(p.sessionTitle, L, y - 16, 12, bold);
  text(p.dateStr, L, y - 32, 10, font, MUTE);
  if (p.venue) text(p.venue, L, y - 46, 10, font, MUTE);
  y -= (p.venue ? 78 : 64);

  // Line item table
  page.drawRectangle({ x: L, y: y - 4, width: R - L, height: 22, color: INK });
  text("DESCRIPTION", L + 10, y + 2, 9, bold, rgb(0.97, 0.94, 0.91));
  right("AMOUNT", R - 10, y + 2, 9, bold, rgb(0.97, 0.94, 0.91));
  y -= 30;
  text(`${p.role} — ${p.sessionTitle}`, L + 10, y, 11);
  right(`$${p.amount.toFixed(2)}`, R - 10, y, 11, bold);
  y -= 16;
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.75, color: rgb(0.8, 0.78, 0.75) });
  y -= 22;
  text("TOTAL PAID", L + 10, y, 12, bold, OLIVE);
  right(`$${p.amount.toFixed(2)}`, R - 10, y, 16, bold, INK);
  right("incl. any GST", R - 10, y - 14, 8, font, MUTE);
  y -= 48;

  if (p.note) {
    text("NOTE", L, y, 9, bold, MUTE);
    // wrap the note to page width
    const words = p.note.split(/\s+/);
    let line = "";
    const maxW = R - L;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, 10) > maxW) { text(line, L, y - 16, 10); y -= 14; line = w; }
      else line = test;
    }
    if (line) text(line, L, y - 16, 10);
    y -= 40;
  }

  // Footer
  const fy = 90;
  page.drawLine({ start: { x: L, y: fy + 20 }, end: { x: R, y: fy + 20 }, thickness: 0.75, color: rgb(0.8, 0.78, 0.75) });
  text("Paid by Stretchy via bank transfer. This statement confirms the payment above.", L, fy, 9, font, MUTE);
  text("hello@stretchyyoga.co.nz  ·  stretchyyoga.co.nz  ·  Stretchy Social Movement Club, Aotearoa", L, fy - 14, 9, font, MUTE);

  return doc.save();
}
