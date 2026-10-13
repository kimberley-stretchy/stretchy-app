// ─────────────────────────────────────────────────────────────────────────────
// SHARED, SERVER-ONLY EMAIL MODULE
//
// Single source of truth for every attendee-facing transactional email. Both
// the admin-gated /api/email route AND the unauthenticated Vercel cron jobs
// (session-check, lock-in) build + send from here by calling Resend DIRECTLY.
//
// Why this exists: the cron jobs used to POST to /api/email, which is guarded
// by requireAdmin(). Cron requests carry no admin session, so every one of
// those sends returned 401 and silently failed — that's why 36h confirm /
// cancel emails never went out. Sending straight through Resend removes the
// auth hop entirely.
// ─────────────────────────────────────────────────────────────────────────────
import { Resend } from "resend";
import { renderAttendeeEmail } from "@/lib/attendeeEmailTemplates";
import { logEmail, logEmails } from "@/lib/emailLog";

export const FROM = "Stretchy <hello@stretchyyoga.co.nz>";
export const REPLY_TO = "kimberley@stretchyyoga.co.nz";
export const HQ_EMAIL = "kimberley@stretchyyoga.co.nz";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.stretchyyoga.co.nz";

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

const LOGO_SVG = `
  <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M 72 18 C 85 18 90 28 85 38 C 80 48 65 50 50 50 C 35 50 20 52 15 62 C 10 72 15 82 28 82 C 41 82 55 75 65 68"
      stroke="#14110F" stroke-width="16" stroke-linecap="round" fill="none"/>
  </svg>
`;

const S_PATH = `M0 172h18v1h-18zM0 173h19v1h-19zM0 174h20v1h-20zM0 175h21v1h-21zM0 176h22v2h-22zM0 178h23v1h-23zM0 179h24v1h-24zM0 180h25v1h-25zM0 181h26v2h-26zM0 183h27v1h-27zM0 184h28v1h-28zM0 185h29v2h-29zM0 187h30v1h-30zM0 188h31v1h-31zM0 189h32v1h-32zM0 190h33v1h-33zM1 167h13v1h-13zM1 168h14v1h-14zM1 169h15v1h-15zM1 170h16v2h-16zM1 191h33v2h-33zM1 193h34v1h-34zM1 194h35v1h-35zM1 195h36v1h-36zM1 196h37v1h-37zM1 197h38v1h-38zM1 84h175v1h-175zM1 85h176v1h-176zM1 86h178v1h-178zM1 87h179v1h-179zM1 88h181v1h-181zM1 89h182v1h-182zM1 90h183v1h-183zM1 91h184v1h-184zM2 163h8v1h-8zM2 164h9v1h-9zM2 165h10v1h-10zM2 166h11v1h-11zM2 79h34v1h-34zM2 80h38v1h-38zM2 198h38v1h-38zM2 199h39v1h-39zM2 200h40v1h-40zM2 201h41v1h-41zM2 202h42v1h-42zM2 81h44v1h-44zM2 82h170v1h-170zM2 83h172v1h-172zM2 92h185v1h-185zM2 93h186v1h-186zM2 94h187v1h-187zM2 95h188v1h-188zM2 96h189v2h-189zM2 98h190v1h-190zM3 162h6v1h-6zM3 76h28v1h-28zM3 77h29v1h-29zM3 78h31v1h-31zM3 203h42v1h-42zM3 204h44v1h-44zM3 205h45v1h-45zM3 206h46v1h-46zM3 99h190v1h-190zM3 100h191v1h-191zM3 101h192v1h-192zM3 102h193v2h-193zM4 161h3v1h-3zM4 74h24v1h-24zM4 75h25v1h-25zM4 207h47v1h-47zM4 208h49v1h-49zM4 209h50v1h-50zM4 104h193v1h-193zM4 105h194v2h-194zM4 107h195v1h-195zM4 108h196v1h-196zM5 73h21v1h-21zM5 210h51v1h-51zM5 211h54v1h-54zM5 212h58v1h-58zM5 109h195v1h-195zM5 110h196v1h-196zM5 111h197v2h-197zM6 72h18v1h-18zM6 214h122v1h-122zM6 213h123v1h-123zM6 113h197v2h-197zM6 115h198v1h-198zM7 71h15v1h-15zM7 217h118v1h-118zM7 216h119v1h-119zM7 215h120v1h-120zM7 116h197v1h-197zM7 117h198v2h-198zM7 119h199v1h-199zM8 219h116v1h-116zM8 218h117v1h-117zM8 120h198v1h-198zM8 121h199v2h-199zM9 70h10v1h-10zM9 221h113v1h-113zM9 220h114v1h-114zM9 123h199v2h-199zM9 125h200v1h-200zM10 222h111v1h-111zM10 126h199v1h-199zM10 127h200v2h-200zM11 224h109v1h-109zM11 223h110v1h-110zM11 129h199v1h-199zM11 130h200v2h-200zM12 226h106v1h-106zM12 225h107v1h-107zM12 132h200v3h-200zM13 227h104v1h-104zM13 135h200v2h-200zM14 229h102v1h-102zM14 228h103v1h-103zM14 137h200v3h-200zM15 230h100v1h-100zM15 140h200v2h-200zM16 231h98v1h-98zM16 142h199v1h-199zM16 143h200v1h-200zM17 232h96v1h-96zM17 144h199v2h-199zM18 234h93v1h-93zM18 233h94v1h-94zM18 146h198v1h-198zM18 147h199v1h-199zM19 235h91v1h-91zM19 148h198v2h-198zM20 236h89v1h-89zM20 150h198v2h-198zM21 237h87v1h-87zM21 152h197v2h-197zM22 238h85v1h-85zM22 154h197v1h-197zM23 239h83v1h-83zM23 155h196v2h-196zM24 240h81v1h-81zM24 157h195v1h-195zM25 241h79v1h-79zM25 158h194v2h-194zM26 242h76v1h-76zM26 160h194v1h-194zM27 243h74v1h-74zM27 161h193v2h-193zM28 244h72v1h-72zM28 163h192v1h-192zM29 245h69v1h-69zM29 164h191v1h-191zM30 165h190v1h-190zM31 246h66v1h-66zM31 166h189v1h-189zM32 247h63v1h-63zM32 167h188v1h-188zM33 248h61v1h-61zM33 168h187v1h-187zM34 169h186v1h-186zM35 249h57v1h-57zM35 170h78v1h-78zM36 250h54v1h-54zM36 171h73v1h-73zM37 172h70v1h-70zM38 251h50v1h-50zM38 173h66v1h-66zM40 252h46v1h-46zM40 174h61v1h-61zM41 175h58v1h-58zM42 253h42v1h-42zM43 176h53v1h-53zM45 254h35v1h-35zM45 177h49v1h-49zM46 178h45v1h-45zM48 255h29v1h-29zM49 179h39v1h-39zM49 81h121v1h-121zM51 180h34v1h-34zM55 256h16v1h-16zM55 181h26v1h-26zM56 80h111v1h-111zM59 182h16v1h-16zM59 79h62v1h-62zM62 78h55v1h-55zM64 77h51v1h-51zM65 76h49v1h-49zM67 75h46v1h-46zM69 74h44v1h-44zM70 73h43v1h-43zM72 72h41v1h-41zM73 71h40v1h-40zM74 70h39v1h-39zM75 69h38v1h-38zM76 68h37v1h-37zM76 212h53v1h-53zM77 67h36v1h-36zM78 66h36v1h-36zM80 65h34v1h-34zM81 64h33v1h-33zM81 63h34v1h-34zM81 211h49v1h-49zM82 62h33v1h-33zM83 61h33v1h-33zM84 60h33v1h-33zM84 210h47v1h-47zM85 59h32v1h-32zM85 58h33v1h-33zM86 57h33v1h-33zM86 209h46v1h-46zM87 56h33v1h-33zM88 55h33v1h-33zM88 208h44v1h-44zM89 54h33v1h-33zM90 53h33v1h-33zM90 52h34v1h-34zM90 207h43v1h-43zM91 51h35v1h-35zM92 50h35v1h-35zM92 206h42v1h-42zM93 49h36v1h-36zM94 48h38v1h-38zM94 47h41v1h-41zM94 205h41v1h-41zM95 204h41v1h-41zM95 46h119v1h-119zM96 45h118v1h-118zM97 203h39v1h-39zM97 43h116v2h-116zM98 202h39v1h-39zM98 42h114v1h-114zM99 201h39v1h-39zM99 41h113v1h-113zM100 39h111v1h-111zM100 40h112v1h-112zM101 200h38v1h-38zM101 38h110v1h-110zM102 199h38v1h-38zM102 37h108v1h-108zM103 198h38v1h-38zM103 36h107v1h-107zM104 197h38v1h-38zM104 35h105v1h-105zM105 196h38v1h-38zM105 33h103v1h-103zM105 34h104v1h-104zM106 195h37v1h-37zM106 32h101v1h-101zM107 194h38v1h-38zM107 31h100v1h-100zM108 193h38v1h-38zM108 30h98v1h-98zM109 192h38v1h-38zM109 28h96v1h-96zM109 29h97v1h-97zM110 191h38v1h-38zM110 190h39v1h-39zM110 27h94v1h-94zM111 189h39v1h-39zM111 26h93v1h-93zM112 188h40v1h-40zM112 25h91v1h-91zM113 187h40v1h-40zM113 186h42v1h-42zM113 23h88v1h-88zM113 24h89v1h-89zM114 185h43v1h-43zM114 22h87v1h-87zM115 184h44v1h-44zM115 183h46v1h-46zM115 21h85v1h-85zM116 182h48v1h-48zM116 181h54v1h-54zM116 20h83v1h-83zM116 170h104v1h-104zM117 19h81v1h-81zM117 179h99v2h-99zM118 18h79v1h-79zM118 178h99v1h-99zM118 176h100v2h-100zM118 173h101v1h-101zM118 175h101v1h-101zM118 171h102v2h-102zM119 17h77v1h-77zM119 174h100v1h-100zM120 15h74v1h-74zM120 16h75v1h-75zM121 14h72v1h-72zM122 13h69v1h-69zM124 12h66v1h-66zM125 11h64v1h-64zM126 79h38v1h-38zM126 10h61v1h-61zM127 9h59v1h-59zM128 8h56v1h-56zM129 7h53v1h-53zM131 6h50v1h-50zM132 5h46v1h-46zM134 78h26v1h-26zM134 4h42v1h-42zM136 3h38v1h-38zM138 2h32v1h-32zM140 1h27v1h-27zM141 77h13v1h-13zM145 0h16v1h-16zM150 47h64v1h-64zM154 48h61v1h-61zM157 49h58v1h-58zM160 50h55v1h-55zM162 51h54v1h-54zM164 52h52v1h-52zM166 53h50v1h-50zM167 54h49v1h-49zM169 55h48v1h-48zM171 56h46v1h-46zM172 57h45v1h-45zM173 58h44v1h-44zM174 59h43v1h-43zM175 181h39v1h-39zM176 60h41v1h-41zM177 61h40v1h-40zM178 62h39v1h-39zM179 63h38v1h-38zM180 64h37v1h-37zM181 65h36v1h-36zM182 182h31v1h-31zM182 66h35v1h-35zM183 67h34v1h-34zM184 68h33v1h-33zM186 69h31v1h-31zM187 70h29v1h-29zM188 183h23v1h-23zM188 71h28v1h-28zM189 72h27v1h-27zM190 73h25v1h-25zM192 74h23v1h-23zM193 75h21v1h-21zM194 76h19v1h-19zM195 184h12v1h-12zM196 77h17v1h-17zM197 78h15v1h-15zM199 79h12v1h-12zM201 80h8v1h-8zM205 81h1v1h-1z`;

// Hosted, TRANSPARENT PNG S-mark (not inline SVG, which mobile mail strips).
// Black on light schemes, cream on dark. Must use the CANONICAL www host: the
// apex domain 308-redirects to www, and mail clients don't follow redirects for
// <img> src, so a non-www URL renders as a broken (invisible) image. S_PATH kept.
const ASSET_BASE = "https://www.stretchyyoga.co.nz";
void S_PATH;
function sLogo(color: string) {
  const light = color.toUpperCase() === "#FFFFFF" || color.toUpperCase() === "#F7F0E8";
  const file = light ? "s-mark-white-v2.png" : "s-mark-black-v2.png";
  return `<img src="${ASSET_BASE}/${file}" width="30" height="35" alt="Stretchy" style="display:inline-block;vertical-align:middle;border:0;" />`;
}
// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────────
// One brand colour per email (never yellow/red — hard to read). The whole email
// is that colour; content sits in OUTLINED boxes — a consistent 2px, 100%-solid
// border (black on light schemes, cream on dark), never a filled panel. Text is
// solid (no washed-out opacity). Buttons are circular. Every email ends with the
// orange "highlight of your week" block, then the footer.

export type Scheme = { bg: string; text: string; btnBg: string; btnText: string };

// Stretchy brand palette (from tailwind.config.ts) at FULL tint. Light grounds
// carry 100% black text/borders/buttons; dark grounds carry white — black is
// illegible on the deep purple/green/blue.
export const SCHEMES: Record<string, Scheme> = {
  cream:  { bg: "#F7F0E8", text: "#000000", btnBg: "#000000", btnText: "#FFFFFF" }, // cream · black
  blue:   { bg: "#29ABE2", text: "#000000", btnBg: "#000000", btnText: "#FFFFFF" }, // sky (light blue) · black
  orange: { bg: "#E96709", text: "#000000", btnBg: "#000000", btnText: "#FFFFFF" }, // orange · black
  olive:  { bg: "#716F39", text: "#FFFFFF", btnBg: "#FFFFFF", btnText: "#000000" }, // green (olive) · white
  purple: { bg: "#902F8A", text: "#FFFFFF", btnBg: "#FFFFFF", btnText: "#000000" }, // purple · white
  dkblue: { bg: "#0000FF", text: "#FFFFFF", btnBg: "#FFFFFF", btnText: "#000000" }, // hot-blue · white
};

const HELLO = "hello@stretchyyoga.co.nz";
const IG = "https://www.instagram.com/stretchy.yoga/";
const CHUBB = "'BN Chubb', 'Arial Black', Arial, sans-serif";

export function header(sc: Scheme) {
  return `<div style="padding:2px 0 22px;">
    ${sLogo(sc.text)}<span style="font-size:20px;font-weight:900;color:${sc.text};letter-spacing:-0.02em;vertical-align:middle;margin-left:8px;">Stretchy</span>
  </div>`;
}
export function h1(sc: Scheme, text: string) {
  return `<h1 style="font-size:30px;font-weight:900;color:${sc.text};margin:0 0 14px;letter-spacing:-0.02em;line-height:1.02;">${text}</h1>`;
}
export function hey(sc: Scheme, name: string) {
  return `<p style="color:${sc.text};font-size:15px;margin:0 0 12px;">Hey ${name},</p>`;
}
export function msg(sc: Scheme, text: string) {
  return `<p style="color:${sc.text};font-size:15px;line-height:1.55;margin:0 0 20px;">${text}</p>`;
}
export function label(sc: Scheme, text: string) {
  return `<p style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${sc.text};margin:0 0 8px;">${text}</p>`;
}
export function box(sc: Scheme, inner: string, pad = 18) {
  return `<div style="border:2px solid ${sc.text};border-radius:16px;padding:${pad}px;margin:0 0 16px;background:transparent;">${inner}</div>`;
}
export function button(sc: Scheme, href: string, text: string) {
  // Colour is forced with !important AND a nested span — otherwise mail clients
  // (Apple Mail especially) override the link colour and the label goes dark on
  // the dark pill / illegible.
  // -webkit-text-fill-color is the reliable one: Apple Mail's dark-mode colour
  // remap ignores `color` (even !important) on links but respects text-fill,
  // so the label stays legible on the dark pill.
  return `<a href="${href}" style="display:block;text-align:center;background:${sc.btnBg};color:${sc.btnText} !important;-webkit-text-fill-color:${sc.btnText} !important;text-decoration:none;font-size:15px;font-weight:800;padding:15px 24px;border-radius:999px;margin:0 0 16px;letter-spacing:.01em;"><span style="color:${sc.btnText} !important;-webkit-text-fill-color:${sc.btnText} !important;text-decoration:none;">${text}</span></a>`;
}
export function row(sc: Scheme, text: string) {
  return `<p style="color:${sc.text};font-size:14px;line-height:1.5;margin:0 0 7px;">${text}</p>`;
}

function signoff(sc: Scheme, text: string) {
  return `<p style="color:${sc.text};font-size:15px;line-height:1.55;margin:16px 0 0;">${text},<br>Stretchy</p>`;
}

export function brandFooter(sc: Scheme) {
  return `<div style="max-width:520px;margin:0 auto;padding:26px 26px 34px;text-align:center;">
    <p style="font-size:12px;color:${sc.text};margin:0 0 10px;">Questions? <a href="mailto:${HELLO}" style="color:${sc.text};font-weight:700;text-decoration:none;">${HELLO}</a></p>
    <p style="font-size:12px;margin:0 0 8px;"><a href="${IG}" style="color:${sc.text};text-decoration:none;font-weight:700;">@stretchy.yoga</a> · <a href="https://www.tiktok.com/@stretchy.yoga" style="color:${sc.text};text-decoration:none;font-weight:700;">TikTok</a></p>
    <p style="font-size:11px;color:${sc.text};margin:0 0 8px;">Made with Love by <a href="https://studiodawn.org" style="color:${sc.text};text-decoration:underline;">Studio Dawn</a></p>
    <p style="font-size:12px;margin:0 0 8px;"><a href="https://stretchyyoga.co.nz" style="color:${sc.text};text-decoration:none;">stretchyyoga.co.nz</a></p>
    <p style="font-size:11px;color:${sc.text};margin:0;">Stretchy Social Movement Club · Built in Aotearoa 🌿</p>
  </div>`;
}

export function highlightBlock(sc: Scheme) {
  // The dividing line sits inside the same 520px column as the content above, so
  // it's the same width as every other line in the email — not edge to edge.
  return `<div style="background:${sc.bg};text-align:center;">
    <div style="max-width:520px;margin:0 auto;padding:0 26px;"><div style="border-top:2px solid ${sc.text};font-size:0;line-height:0;height:0;">&nbsp;</div></div>
    <div style="padding:34px 24px 40px;">
    ${sLogo(sc.text)}
    <h2 style="font-family:${CHUBB};font-weight:900;font-size:32px;line-height:1;color:${sc.text};text-transform:uppercase;letter-spacing:-0.01em;margin:14px auto 0;max-width:340px;">Welcome to the highlight of your week.</h2>
  </div></div>`;
}

// Page wrapper: colour edge-to-edge, content, THEN the orange highlight block,
// THEN the footer (highlight sits above the footer).
export function page(
  schemeName: string,
  inner: (sc: Scheme) => string,
  // afterFooter: a last line under the footer (newsletters put Unsubscribe here).
  opts: { highlight?: boolean; afterFooter?: (sc: Scheme) => string } = {}
) {
  const sc = SCHEMES[schemeName] ?? SCHEMES.cream;
  const showHighlight = opts.highlight !== false;
  return `<div style="background:${sc.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:30px 26px 20px;">
      ${header(sc)}
      ${inner(sc)}
    </div>
    ${showHighlight ? highlightBlock(sc) : ""}
    ${brandFooter(sc)}
    ${opts.afterFooter ? opts.afterFooter(sc) : ""}
  </div>`;
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────
// The attendee emails live in lib/attendeeEmailTemplates.ts.

// City waitlist welcome — all orange, S logo + Stretchy header, standard footer.
export function buildWaitlistEmail(name: string, city?: string): { subject: string; html: string } {
  const where = city ? city : "your area";
  const html = page("orange", (sc) => `
    ${h1(sc, "You're on the list. 🌏")}
    ${hey(sc, name)}
    ${msg(sc, `Thanks for signing up. You'll be among the first to know when Stretchy comes to ${where}.`)}
    ${msg(sc, "Tell your mates, dates, pals, parents 🙌 — the more requests for a location, a Social Stretch & the type of movement, the sooner we can get there! And the more we move together, the better it gets.")}
    ${button(sc, "https://stretchyyoga.co.nz", "Share Stretchy →")}
    ${msg(sc, `And keep following us on <a href="${IG}" style="color:${sc.text};font-weight:700;">Instagram</a> & <a href="https://www.tiktok.com/@stretchy.yoga" style="color:${sc.text};font-weight:700;">TikTok</a> for more updates. 🌞`)}
    ${signoff(sc, "See you soon")}
  `);
  return { subject: "You're on the Stretchy waitlist 🌏", html };
}

// Remittance advice — payout confirmation to a teacher / GEM / venue / supplier /
// charity for a specific session. HQ pays via bank transfer; this is the receipt.
export function buildRemittanceEmail(p: {
  payeeName: string;
  role: string;
  amount: string;      // formatted, e.g. "$120.00"
  sessionTitle: string;
  dateStr: string;
  venue?: string | null;
  note?: string;
  invoiceNo?: string;  // the contractor's own invoice number
  forHQ?: boolean;     // the HQ copy summarises rather than addresses the payee
}): { subject: string; html: string } {
  const roleLc = p.role.toLowerCase();
  const html = page("olive", (sc) => `
    ${label(sc, "Stretchy · Remittance advice")}
    ${h1(sc, p.forHQ ? "Payout sent 💸" : "You've been paid. 💸")}
    ${msg(sc, p.forHQ
      ? `A payout of <strong>${p.amount}</strong> to <strong>${p.payeeName}</strong> (${p.role}) has been recorded and a remittance sent.`
      : `Hi ${p.payeeName.split(" ")[0] || "there"}, here's your payout from Stretchy for the session below. It's on its way to you via bank transfer.`)}
    ${box(sc, `${label(sc, "Payment")}
      <p style="font-size:34px;font-weight:900;color:${sc.text};margin:0 0 8px;letter-spacing:-0.02em;">${p.amount}</p>
      ${row(sc, `For: <strong>${p.role}</strong>`)}
      ${row(sc, `Session: <strong>${p.sessionTitle}</strong>`)}
      ${row(sc, `🗓 ${p.dateStr}`)}
      ${p.venue ? row(sc, `📍 ${p.venue}`) : ""}
      ${p.invoiceNo ? row(sc, `🧾 Invoice no: <strong>${p.invoiceNo}</strong>`) : ""}`)}
    ${p.note ? msg(sc, p.note) : ""}
    ${msg(sc, p.forHQ ? "Filed for your records." : `Any questions about your ${roleLc} payment, just reply to this email.`)}
    ${signoff(sc, p.forHQ ? "Stretchy HQ" : "Thanks for moving with us")}
  `, { highlight: false });
  return { subject: p.forHQ ? `Payout sent: ${p.payeeName} — ${p.amount} (${p.sessionTitle})` : `Your Stretchy payout — ${p.amount}`, html };
}

// ─── BUILD + SEND ─────────────────────────────────────────────────────────────

export type AttendeeEmailType =
  | "hold_confirmed"
  | "session_going_ahead"
  | "session_cancelled"
  | "price_locked"
  | "hold_cancelled"
  | "almost_there"
  | "comp_hold_confirmed"
  | "session_confirmed_open"
  | "booking_card_failed";

export interface AttendeeEmailPayload {
  to: string;
  name: string;
  sessionTitle: string;
  date: string;
  price?: string;
  venue?: string;
  socialStretchVenue?: string;
  cancelUrl?: string;
  sessionId?: string;
  shareUrl?: string;
  needed?: number;
  isHolder?: boolean;
  isComp?: boolean;
  newAccount?: boolean;
  teacherName?: string;
  teacherStyle?: string;
  gemName?: string;
  durationLabel?: string;
  directions?: string;
  isFirstStretchy?: boolean;
  sessionGoingAhead?: boolean;
  attendeeCount?: number;
  spots?: number;        // how many spaces THIS person reserved
  totalPrice?: string;   // per-spot price × spots (formatted), when spots > 1
  teacherHandle?: string;
  gemHandle?: string;
  venueHandle?: string;
  socialVenueHandle?: string;
  // ── Session facts for the refreshed emails (filled by buildSessionEmailExtras) ──
  startsAt?: string;          // ISO start time — all dates and times come from this
  durationMins?: number;
  minAttendees?: number;
  maxAttendees?: number;
  held?: number;              // places held right now
  costBase?: number;
  revenueTarget?: number;
  sessionState?: string;
  locationAddress?: string;
  styleLine?: string;         // "Vinyasa yoga"
  level?: string;             // "all levels"
  bringTitle?: string;        // HQ's "Bring with you" bold line
  bringNote?: string;         // …and grey line
  unitPriceCents?: number;    // exact per-place amount charged (final price email)
  declineReason?: string;     // card-didn't-go-through email: the bank's reason, in plain words
  calledOffByHQ?: boolean;    // session cancelled by HQ, not for missing the minimum
  cancelledSpots?: number;    // hold-cancelled email: places just cancelled…
  remainingSpots?: number;    // …and places still held (0 = whole hold cancelled)
}

export function buildAttendeeEmail(type: AttendeeEmailType, p: AttendeeEmailPayload): { subject: string; html: string } {
  return renderAttendeeEmail(type, p);
}

function toPlainText(html: string): string {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, "\n").trim();
}

export async function sendAttendeeEmail(
  type: AttendeeEmailType,
  payload: AttendeeEmailPayload,
  opts: { bcc?: string } = {}
): Promise<{ id?: string; error?: unknown }> {
  if (!process.env.RESEND_API_KEY) {
    console.error("sendAttendeeEmail: RESEND_API_KEY missing");
    return { error: "RESEND_API_KEY missing" };
  }
  try {
    const { subject, html } = buildAttendeeEmail(type, payload);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: payload.to,
      reply_to: REPLY_TO,
      ...(opts.bcc ? { bcc: opts.bcc } : {}),
      subject,
      html,
      text: toPlainText(html),
    });
    await logEmail({
      sessionId: payload.sessionId,
      recipient: payload.to,
      emailType: type,
      subject,
      resendId: data?.id ?? null,
      status: error ? "error" : "sent",
      error: error ? (error as { message?: string }).message ?? String(error) : null,
    });
    if (error) {
      console.error(`sendAttendeeEmail(${type}) error:`, error);
      return { error };
    }
    return { id: data?.id };
  } catch (error) {
    console.error(`sendAttendeeEmail(${type}) threw:`, error);
    await logEmail({ sessionId: payload.sessionId, recipient: payload.to, emailType: type, status: "error", error: String(error) });
    return { error };
  }
}

// Send many attendee emails in ONE Resend request (up to 100 per call) so a
// cron looping over a roomful of holders can't trip Resend's ~2/sec rate limit
// (which was silently dropping most sends). Never throws.
export async function sendAttendeeBatch(
  items: { type: AttendeeEmailType; payload: AttendeeEmailPayload; bcc?: string }[]
): Promise<{ sent: number; error?: unknown }> {
  const valid = items.filter((i) => i.payload.to);
  if (valid.length === 0) return { sent: 0 };
  if (!process.env.RESEND_API_KEY) {
    console.error("sendAttendeeBatch: RESEND_API_KEY missing");
    return { sent: 0, error: "RESEND_API_KEY missing" };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const emails = valid.map(({ type, payload, bcc }) => {
    const { subject, html } = buildAttendeeEmail(type, payload);
    return {
      from: FROM,
      to: payload.to,
      reply_to: REPLY_TO,
      ...(bcc ? { bcc } : {}),
      subject,
      html,
      text: toPlainText(html),
    };
  });
  let sent = 0;
  try {
    for (let i = 0; i < emails.length; i += 100) {
      const chunk = emails.slice(i, i + 100);
      const chunkItems = valid.slice(i, i + 100);
      const { error } = await resend.batch.send(chunk);
      // Audit-log every recipient in the chunk (one Resend error fails the chunk).
      await logEmails(chunkItems.map(({ type, payload }) => ({
        sessionId: payload.sessionId,
        recipient: payload.to,
        emailType: type,
        subject: buildAttendeeEmail(type, payload).subject,
        status: error ? "error" : "sent",
        error: error ? (error as { message?: string }).message ?? String(error) : null,
      })));
      if (error) {
        console.error("sendAttendeeBatch error:", error);
        return { sent, error };
      }
      sent += chunk.length;
    }
  } catch (error) {
    console.error("sendAttendeeBatch threw:", error);
    return { sent, error };
  }
  return { sent };
}
