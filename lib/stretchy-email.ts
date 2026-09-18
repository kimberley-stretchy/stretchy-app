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
import { logEmail, logEmails } from "@/lib/emailLog";

export const FROM = "Stretchy <hello@stretchy.social>";
export const REPLY_TO = "kimberley@stretchyyoga.co.nz";
export const HQ_EMAIL = "kimberley@stretchyyoga.co.nz";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://stretchyyoga.co.nz";

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
  const file = light ? "s-mark-white.png" : "s-mark-black.png";
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
function caption(sc: Scheme, text: string) {
  return `<p style="color:${sc.text};font-size:12px;line-height:1.5;margin:0;">${text}</p>`;
}
function para(sc: Scheme, text: string) {
  return `<p style="color:${sc.text};font-size:13px;line-height:1.6;margin:0 0 16px;">${text}</p>`;
}

// Merged "Your Stretchy" card — session details AND who's on, in one box.
function stretchyCard(sc: Scheme, p: AttendeeEmailPayload, tag: string) {
  const parts: string[] = [
    label(sc, tag),
    `<p style="color:${sc.text};font-size:20px;font-weight:800;margin:0 0 8px;letter-spacing:-0.01em;">${p.sessionTitle}</p>`,
    `<p style="color:${sc.text};font-size:14px;margin:0 0 4px;">🗓 ${p.date}</p>`,
    `<p style="color:${sc.text};font-size:14px;margin:0 0 4px;">📍 ${p.venue || "TBC"}${p.venueHandle ? ` · ${p.venueHandle}` : ""}</p>`,
  ];
  if (p.teacherName || p.teacherStyle)
    parts.push(`<p style="color:${sc.text};font-size:14px;margin:0 0 4px;">🧘 ${p.teacherStyle ?? "Movement"}${p.teacherName ? ` with ${p.teacherName}` : ""}${p.teacherHandle ? ` · ${p.teacherHandle}` : ""}</p>`);
  if (p.gemName)
    parts.push(`<p style="color:${sc.text};font-size:14px;margin:0 0 4px;">💫 GEM on the day: ${p.gemName}${p.gemHandle ? ` · ${p.gemHandle}` : ""}</p>`);
  if (p.spots && p.spots > 1)
    parts.push(`<p style="color:${sc.text};font-size:14px;font-weight:800;margin:0 0 4px;">🎟 You're holding ${p.spots} spots — bring the crew!</p>`);
  // Social Stretch + getting-there/parking live together at the foot of the card.
  const foot: string[] = [];
  if (p.socialStretchVenue)
    foot.push(`<p style="color:${sc.text};font-size:13px;margin:0 0 6px;">🌞 Social Stretch after at ${p.socialStretchVenue}${p.socialVenueHandle ? ` · ${p.socialVenueHandle}` : ""}</p>`);
  if (p.directions)
    foot.push(`<p style="color:${sc.text};font-size:13px;margin:0;">🚗 Getting there / parking: ${p.directions}</p>`);
  if (foot.length)
    parts.push(`<div style="margin:10px 0 0;padding-top:10px;border-top:2px solid ${sc.text};">${foot.join("")}</div>`);
  return box(sc, parts.join(""), 20);
}

function priceBox(sc: Scheme, value: string, cap: string, heading = "Current price per spot") {
  return box(sc, `${label(sc, heading)}
    <p style="font-size:32px;font-weight:900;color:${sc.text};margin:0 0 4px;letter-spacing:-0.02em;">${value}</p>
    ${caption(sc, cap)}`);
}

function tellMates(sc: Scheme) {
  return `<p style="color:${sc.text};font-size:14px;line-height:1.6;margin:0 0 16px;font-weight:700;">Tell your mates, dates, mum, randoms 🙌 — the more people who move together, the better it gets for all (and the cheaper it gets, too).</p>`;
}

function signoff(sc: Scheme, text: string) {
  return `<p style="color:${sc.text};font-size:15px;line-height:1.55;margin:16px 0 0;">${text},<br>Stretchy</p>`;
}

function cancellationBlock(sc: Scheme, cancelUrl: string) {
  return `<div style="border-top:2px solid ${sc.text};margin-top:16px;padding-top:16px;">
    ${label(sc, "Cancellation window")}
    <p style="color:${sc.text};font-size:13px;line-height:1.6;margin:0 0 12px;">${CANCEL_WINDOW}</p>
    ${button(sc, cancelUrl, "View or cancel my booking")}
  </div>`;
}

function whatToBring(sc: Scheme) {
  return box(sc, `${label(sc, "What to bring")}
    ${row(sc, "🧘 BYO yoga mat")}
    ${row(sc, "🧠 A Stretchy mindset")}
    ${row(sc, "💧 A water bottle & any props you may need (yoga block, cushion for knees, yoga strap)")}
    ${row(sc, "💸 $$ for your food & bev after")}`);
}

function directionsBox(sc: Scheme, directions?: string) {
  if (!directions) return "";
  return box(sc, `${label(sc, "Getting there / parking")}${caption(sc, directions)}`);
}

function firstStretchy(sc: Scheme, p: AttendeeEmailPayload) {
  const gem = p.gemName ?? "your GEM";
  const teacher = p.teacherName ?? "your teacher";
  const mins = p.durationLabel ?? "~60 min";
  const style = p.teacherStyle ?? "movement";
  return box(sc, `${label(sc, "✨ Your first Stretchy?")}
    <p style="color:${sc.text};font-size:15px;font-weight:800;margin:0 0 10px;">Here's what to expect</p>
    ${row(sc, `⏰ Come 5 mins early to introduce yourself to ${gem} and ${teacher}.`)}
    ${row(sc, `🧘 ${mins} of ${style} — always go at your own pace & take it as you need. No judgement here, we're a welcoming crew.`)}
    ${row(sc, `🌞 Enjoy the Social Stretch after. Our GEMs (Good Energy Managers) are there to make sure you feel comfy. Say hi to someone new!`)}
    ${row(sc, `🎒 BYO yoga mat & $$ for the Social Stretch.`)}
    ${row(sc, `💬 Any questions before then, flick us a message at ${HELLO}.`)}`);
}

function bigCount(sc: Scheme, n: number) {
  return `<div style="margin:4px 0 18px;">
    <div style="font-size:68px;font-weight:900;line-height:1;color:${sc.text};letter-spacing:-0.03em;">${n}</div>
    <p style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:${sc.text};margin:8px 0 0;">${n === 1 ? "spot" : "spots"} left to go</p>
  </div>`;
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
  return `<div style="background:${sc.bg};padding:34px 24px 40px;text-align:center;border-top:2px solid ${sc.text};">
    ${sLogo(sc.text)}
    <h2 style="font-family:${CHUBB};font-weight:900;font-size:32px;line-height:1;color:${sc.text};text-transform:uppercase;letter-spacing:-0.01em;margin:14px auto 0;max-width:340px;">Welcome to the highlight of your week.</h2>
  </div>`;
}

// Page wrapper: colour edge-to-edge, content, THEN the orange highlight block,
// THEN the footer (highlight sits above the footer).
export function page(schemeName: string, inner: (sc: Scheme) => string, opts: { highlight?: boolean } = {}) {
  const sc = SCHEMES[schemeName] ?? SCHEMES.cream;
  const showHighlight = opts.highlight !== false;
  return `<div style="background:${sc.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:30px 26px 20px;">
      ${header(sc)}
      ${inner(sc)}
    </div>
    ${showHighlight ? highlightBlock(sc) : ""}
    ${brandFooter(sc)}
  </div>`;
}

const CANCEL_WINDOW =
  "Cancel free any time before the 36-hour mark — no charge. After that, we treat it as locked in and the price stands, because by then we've committed to your teacher, your GEM, and your venue. That's what keeps it fair for everyone who shows up. If we ever have to cancel on our end, you're refunded in full — always.";

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

function holdConfirmedEmail(p: AttendeeEmailPayload) {
  const many = !!(p.spots && p.spots > 1);
  const crew = p.spots && p.spots >= 4 ? "a whole crew" : "you and your people";
  return page("blue", (sc) => `
    ${h1(sc, many ? `You've held ${p.spots} spots. 🙌` : "You've held a spot. 🙌")}
    ${hey(sc, p.name)}
    ${msg(sc, many
      ? `You've held <strong>${p.spots} spots</strong> for <strong>${p.sessionTitle}</strong> — love it, that's ${crew} coming together. 🙌 Nothing's charged yet. 🧘`
      : `Your spot's held for <strong>${p.sessionTitle}</strong>. Nothing's charged yet. 🧘`)}
    ${stretchyCard(sc, p, "Your Stretchy")}
    ${box(sc, `${label(sc, "Current price per spot")}
      <p style="font-size:32px;font-weight:900;color:${sc.text};margin:0 0 4px;letter-spacing:-0.02em;">${p.price ?? "TBC"}</p>
      ${p.spots && p.spots > 1 && p.totalPrice ? `<p style="color:${sc.text};font-size:15px;font-weight:800;margin:0 0 6px;">× ${p.spots} spots = ${p.totalPrice} at today's price</p>` : ""}
      ${caption(sc, "The current starting price — the most you could ever pay for this one. From here it only gets better-er as more people join. Your card's charged 2 hours before, at the final price. 📉")}
      ${cancellationBlock(sc, p.cancelUrl || `${APP_URL}/hold/${p.sessionId ?? ""}`)}`)}
    ${tellMates(sc)}
    ${signoff(sc, "See you soon")}
  `);
}

function almostThereEmail(p: AttendeeEmailPayload) {
  const needed = Math.max(p.needed ?? 1, 1);
  const neededPeople = `${needed} more ${needed === 1 ? "person" : "people"}`;
  const shareUrl = p.shareUrl || (p.sessionId ? `${APP_URL}/sessions/${p.sessionId}` : `${APP_URL}/sessions`);
  if (p.isHolder) {
    const spotWord = p.isComp ? "place is saved" : "spot is held";
    return page("purple", (sc) => `
      ${h1(sc, "So close to going ahead. 👀")}
      ${hey(sc, p.name)}
      ${msg(sc, `We just need <strong>${neededPeople}</strong> for this Stretchy session to go ahead. Your ${spotWord}, but this is the moment to get more people together: tell your mates, your co-workers, the guy in the coffee line. 🙌`)}
      ${button(sc, shareUrl, "Share this Stretchy →")}
      ${stretchyCard(sc, p, "Your Stretchy")}
      ${p.isComp
        // Comps can't cancel or be charged — no cancellation-window box, just a nudge to help fill it.
        ? box(sc, `${label(sc, "Heads up · on us")}<p style="color:${sc.text};font-size:13px;line-height:1.6;margin:0;">You're in on us — nothing to pay. We just need <strong>${neededPeople}</strong> to lock it in by the <strong>36-hour mark (about 2 hours from now)</strong>. Share it around and help make it happen. 💛</p>`)
        : box(sc, `${label(sc, "Heads up · cancellation window")}<p style="color:${sc.text};font-size:13px;line-height:1.6;margin:0 0 12px;">You can still cancel free until the <strong>36-hour mark — about 2 hours from now</strong>. After that your place is locked in and the price stands. If we don't reach the minimum by then, it's called off and nothing's charged.</p>${button(sc, p.cancelUrl || `${APP_URL}/hold/${p.sessionId ?? ""}`, "Manage my hold")}`)}
      ${signoff(sc, "See you soon")}
    `);
  }
  return page("purple", (sc) => `
    ${h1(sc, `Interested?! We need ${neededPeople} for this Stretchy to go ahead.`)}
    ${hey(sc, p.name)}
    ${msg(sc, `We just need <strong>${neededPeople}</strong> for this Stretchy session to go ahead. Could that be you?!`)}
    ${msg(sc, `From there if we reach our minimum numbers, the session is all go, and the price may keep dropping — the more people who move together, the better it gets for all. Spread the word.`)}
    ${button(sc, shareUrl, "Grab your spot →")}
    ${stretchyCard(sc, p, "The Session")}
    ${p.price ? priceBox(sc, p.price, "The more of us who come together, the better-er it gets — the price only keeps dropping.", "Price right now") : ""}
    ${button(sc, shareUrl, "Grab your spot →")}
    ${signoff(sc, "Hope to see you soon")}
  `);
}

function sessionGoingAheadEmail(p: AttendeeEmailPayload) {
  const isComp = p.isComp ?? false;
  const url = p.sessionId ? `${APP_URL}/notifications/going-ahead?session=${p.sessionId}` : `${APP_URL}/sessions`;
  return page("olive", (sc) => `
    ${h1(sc, "It's happening! 🧘")}
    ${hey(sc, p.name)}
    ${msg(sc, p.spots && p.spots > 1
      ? `This one's going ahead — all <strong>${p.spots}</strong> of your spots are in. See you on the mat! 🤙`
      : `This one's going ahead. See you on the mat! 🤙`)}
    ${stretchyCard(sc, p, "Confirmed")}
    ${priceBox(sc, isComp ? "On us 💛" : (p.price ?? "TBC"), isComp ? "This one's covered by Stretchy — nothing to pay. Just show up. 🧘" : "This is your ceiling — the most you'll ever pay. It can still drop from here, never rise. Your card's charged 2 hours before, at the final price. 📉", isComp ? "Your spot" : "The current price")}
    ${p.isFirstStretchy ? firstStretchy(sc, p) : whatToBring(sc)}
    ${button(sc, url, "View your session →")}
    ${signoff(sc, "See you soon")}
  `);
}

function openConfirmedEmail(p: AttendeeEmailPayload) {
  const bookUrl = p.shareUrl || (p.sessionId ? `${APP_URL}/sessions/${p.sessionId}` : `${APP_URL}/sessions`);
  return page("orange", (sc) => `
    ${h1(sc, "Still interested? Stretchy is on & the price is droppppppin' 📉")}
    ${hey(sc, p.name)}
    ${msg(sc, `<strong>${p.sessionTitle}</strong> hit its minimum and is going ahead. You marked yourself interested, so heads up: there's still room, but spots go. Grab yours. 🧘`)}
    ${stretchyCard(sc, p, "Going ahead")}
    ${p.price ? priceBox(sc, p.price, "Nothing's charged until 2 hours before — and the more of us who come together, the better-er it gets.", "Price right now") : ""}
    ${button(sc, bookUrl, "Book my spot →")}
    ${signoff(sc, "Hope to see you soon")}
  `);
}

function sessionCancelledEmail(p: AttendeeEmailPayload) {
  const url = p.sessionId ? `${APP_URL}/notifications/cancelled?session=${p.sessionId}` : `${APP_URL}/sessions`;
  return page("cream", (sc) => `
    ${h1(sc, "Not this time. 💛")}
    ${hey(sc, p.name)}
    ${msg(sc, `Unfortunately this one didn't get enough holds to go ahead. Nothing was charged. Let's get the next session running — tell your mates, a random, a date, your flatmates. 💛`)}
    ${stretchyCard(sc, p, "Didn't go ahead")}
    ${para(sc, "The more people who move together, the better the price gets for everyone — and the more sessions go ahead. Keep an eye out for what's next. 🌞")}
    ${button(sc, url, "See what's next →")}
    ${signoff(sc, "Hope to see you soon")}
  `, { highlight: false });
}

function priceLockedEmail(p: AttendeeEmailPayload) {
  const isComp = p.isComp ?? false;
  const crew = p.attendeeCount ? `${p.attendeeCount} people` : "a great crew";
  const style = p.teacherStyle ?? "movement";
  return page("orange", (sc) => `
    ${h1(sc, "We're moving &amp; grooving together. 🕺")}
    ${hey(sc, p.name)}
    ${msg(sc, isComp
      ? `We now have <strong>${crew}</strong> coming together for ${style} in a couple of hours. This one's on us — nothing to pay.`
      : `We now have <strong>${crew}</strong> coming together for ${style} in a couple of hours. So the final price is now locked &amp; loaded: <strong>${p.price ?? ""}</strong>${p.spots && p.spots > 1 ? ` per spot` : ""}.`)}
    ${msg(sc, isComp ? "We'll see you shortly to stretch bodies, minds &amp; social circles." : "Your card is now charged and we'll see you shortly to stretch bodies, minds &amp; social circles.")}
    ${msg(sc, "All the deets below.")}
    ${msg(sc, "Catch you soon,<br>Stretchy")}
    ${box(sc, `${label(sc, isComp ? "Your spot · on us" : (p.spots && p.spots > 1 ? "Total charged now" : "Final price · charged now"))}
      <p style="font-size:36px;font-weight:900;color:${sc.text};margin:0 0 6px;letter-spacing:-0.02em;">${isComp ? "On us 💛" : (p.spots && p.spots > 1 && p.totalPrice ? p.totalPrice : (p.price ?? ""))}</p>
      ${caption(sc, isComp
        ? "Covered by Stretchy — nothing to pay. Thanks for coming along."
        : (p.spots && p.spots > 1
            ? `Your ${p.spots} spots at ${p.price ?? ""} each — charged now in one go. Thanks for making it happen.`
            : "Your final price for this Stretchy social movement. Thanks for making it happen. Heads up, your card is charged now at this final price per person."))}`)}
    ${stretchyCard(sc, p, "You're in")}
    ${p.isFirstStretchy ? firstStretchy(sc, p) : whatToBring(sc)}
  `);
}

function holdCancelledEmail(p: AttendeeEmailPayload) {
  return page("cream", (sc) => `
    ${h1(sc, "Hold cancelled. 👋")}
    ${hey(sc, p.name)}
    ${msg(sc, `Your hold's been cancelled. Nothing was charged — your card authorisation's been released.`)}
    ${stretchyCard(sc, p, "Cancelled")}
    ${p.sessionGoingAhead ? "" : para(sc, "Changed your mind? There's still time to grab a spot. 🧘")}
    ${button(sc, `${APP_URL}/sessions`, "Browse sessions →")}
    ${signoff(sc, "Hope to see you soon")}
  `, { highlight: false });
}

function compHoldConfirmedEmail(p: AttendeeEmailPayload) {
  const manageUrl = p.sessionId ? `${APP_URL}/hold/${p.sessionId}` : `${APP_URL}/sessions`;
  const loginUrl = `${APP_URL}/login${p.sessionId ? `?next=/hold/${p.sessionId}` : ""}`;
  // White box with purple text + purple button (reversed out of the purple ground).
  const whiteBox = (heading: string, bodyHtml: string, href: string, cta: string) => `<div style="background:#FFFFFF;border-radius:16px;padding:18px;margin:0 0 16px;">
    ${heading ? `<p style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#902F8A;margin:0 0 8px;">${heading}</p>` : ""}
    <p style="color:#902F8A;font-size:13px;line-height:1.5;margin:0 0 12px;">${bodyHtml}</p>
    <a href="${href}" style="display:block;text-align:center;background:#902F8A;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;text-decoration:none;font-size:15px;font-weight:800;padding:15px 24px;border-radius:999px;"><span style="color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;text-decoration:none;">${cta}</span></a>
  </div>`;
  return page("purple", (sc) => `
    ${h1(sc, "We've held you a place — on us. 💛")}
    ${hey(sc, p.name)}
    ${msg(sc, `Stretchy HQ has saved you a spot at <strong>${p.sessionTitle}</strong>. It's our shout, so there's nothing to pay — just come and move with us. 🧘`)}
    ${msg(sc, `Heads up: Stretchy needs a minimum number of people to make a session happen, so we'll confirm about <strong>36 hours out</strong> whether it's going ahead (we'll email you either way).`)}
    ${msg(sc, "Hope to see you soon,<br>Stretchy")}
    ${stretchyCard(sc, p, "Your spot · on us")}
    ${p.newAccount
      ? whiteBox("One quick thing — set up your account", "So you can see your spot and get your reminders, finish setting up your account. Log in with this email — we'll send you a code, no password needed.", loginUrl, "Set up my account →")
      : whiteBox("", "It's all in your account — view the details or add it to your calendar any time.", manageUrl, "View my spot →")}
    ${whatToBring(sc)}
  `);
}

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

// ─── BUILD + SEND ─────────────────────────────────────────────────────────────

export type AttendeeEmailType =
  | "hold_confirmed"
  | "session_going_ahead"
  | "session_cancelled"
  | "price_locked"
  | "hold_cancelled"
  | "almost_there"
  | "comp_hold_confirmed"
  | "session_confirmed_open";

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
}

export function buildAttendeeEmail(type: AttendeeEmailType, p: AttendeeEmailPayload): { subject: string; html: string } {
  const t = p.sessionTitle;
  switch (type) {
    case "hold_confirmed":
      return { subject: `You're holding a place — ${t}`, html: holdConfirmedEmail(p) };
    case "session_going_ahead":
      return { subject: `It's happening — ${t}`, html: sessionGoingAheadEmail(p) };
    case "session_cancelled":
      return { subject: `Not this time — ${t}`, html: sessionCancelledEmail(p) };
    case "price_locked":
      return { subject: p.isComp ? `You're locked in for ${t} 🧘` : `You're locked in — ${t}`, html: priceLockedEmail(p) };
    case "hold_cancelled":
      return { subject: `Hold cancelled — ${t}`, html: holdCancelledEmail(p) };
    case "almost_there":
      return { subject: (p.needed ?? 0) <= 1 ? `1 more and ${t} is on 👀` : `${p.needed} more and ${t} is on 👀`, html: almostThereEmail(p) };
    case "comp_hold_confirmed":
      return { subject: `We've held you a place — ${t} (on us 💛)`, html: compHoldConfirmedEmail(p) };
    case "session_confirmed_open":
      return { subject: `It's on — ${t}. Grab a spot 🎉`, html: openConfirmedEmail(p) };
  }
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
      headers: { "X-Priority": "1", "X-MSMail-Priority": "High", "Importance": "High" },
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
      headers: { "X-Priority": "1", "Importance": "High" },
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
