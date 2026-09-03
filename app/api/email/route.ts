import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/adminAuth";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Stretchy <hello@stretchy.social>";
const REPLY_TO = "kimberley@stretchyyoga.co.nz";

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

const LOGO_SVG = `
  <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M 72 18 C 85 18 90 28 85 38 C 80 48 65 50 50 50 C 35 50 20 52 15 62 C 10 72 15 82 28 82 C 41 82 55 75 65 68"
      stroke="#14110F" stroke-width="16" stroke-linecap="round" fill="none"/>
  </svg>
`;

const S_PATH = `M0 172h18v1h-18zM0 173h19v1h-19zM0 174h20v1h-20zM0 175h21v1h-21zM0 176h22v2h-22zM0 178h23v1h-23zM0 179h24v1h-24zM0 180h25v1h-25zM0 181h26v2h-26zM0 183h27v1h-27zM0 184h28v1h-28zM0 185h29v2h-29zM0 187h30v1h-30zM0 188h31v1h-31zM0 189h32v1h-32zM0 190h33v1h-33zM1 167h13v1h-13zM1 168h14v1h-14zM1 169h15v1h-15zM1 170h16v2h-16zM1 191h33v2h-33zM1 193h34v1h-34zM1 194h35v1h-35zM1 195h36v1h-36zM1 196h37v1h-37zM1 197h38v1h-38zM1 84h175v1h-175zM1 85h176v1h-176zM1 86h178v1h-178zM1 87h179v1h-179zM1 88h181v1h-181zM1 89h182v1h-182zM1 90h183v1h-183zM1 91h184v1h-184zM2 163h8v1h-8zM2 164h9v1h-9zM2 165h10v1h-10zM2 166h11v1h-11zM2 79h34v1h-34zM2 80h38v1h-38zM2 198h38v1h-38zM2 199h39v1h-39zM2 200h40v1h-40zM2 201h41v1h-41zM2 202h42v1h-42zM2 81h44v1h-44zM2 82h170v1h-170zM2 83h172v1h-172zM2 92h185v1h-185zM2 93h186v1h-186zM2 94h187v1h-187zM2 95h188v1h-188zM2 96h189v2h-189zM2 98h190v1h-190zM3 162h6v1h-6zM3 76h28v1h-28zM3 77h29v1h-29zM3 78h31v1h-31zM3 203h42v1h-42zM3 204h44v1h-44zM3 205h45v1h-45zM3 206h46v1h-46zM3 99h190v1h-190zM3 100h191v1h-191zM3 101h192v1h-192zM3 102h193v2h-193zM4 161h3v1h-3zM4 74h24v1h-24zM4 75h25v1h-25zM4 207h47v1h-47zM4 208h49v1h-49zM4 209h50v1h-50zM4 104h193v1h-193zM4 105h194v2h-194zM4 107h195v1h-195zM4 108h196v1h-196zM5 73h21v1h-21zM5 210h51v1h-51zM5 211h54v1h-54zM5 212h58v1h-58zM5 109h195v1h-195zM5 110h196v1h-196zM5 111h197v2h-197zM6 72h18v1h-18zM6 214h122v1h-122zM6 213h123v1h-123zM6 113h197v2h-197zM6 115h198v1h-198zM7 71h15v1h-15zM7 217h118v1h-118zM7 216h119v1h-119zM7 215h120v1h-120zM7 116h197v1h-197zM7 117h198v2h-198zM7 119h199v1h-199zM8 219h116v1h-116zM8 218h117v1h-117zM8 120h198v1h-198zM8 121h199v2h-199zM9 70h10v1h-10zM9 221h113v1h-113zM9 220h114v1h-114zM9 123h199v2h-199zM9 125h200v1h-200zM10 222h111v1h-111zM10 126h199v1h-199zM10 127h200v2h-200zM11 224h109v1h-109zM11 223h110v1h-110zM11 129h199v1h-199zM11 130h200v2h-200zM12 226h106v1h-106zM12 225h107v1h-107zM12 132h200v3h-200zM13 227h104v1h-104zM13 135h200v2h-200zM14 229h102v1h-102zM14 228h103v1h-103zM14 137h200v3h-200zM15 230h100v1h-100zM15 140h200v2h-200zM16 231h98v1h-98zM16 142h199v1h-199zM16 143h200v1h-200zM17 232h96v1h-96zM17 144h199v2h-199zM18 234h93v1h-93zM18 233h94v1h-94zM18 146h198v1h-198zM18 147h199v1h-199zM19 235h91v1h-91zM19 148h198v2h-198zM20 236h89v1h-89zM20 150h198v2h-198zM21 237h87v1h-87zM21 152h197v2h-197zM22 238h85v1h-85zM22 154h197v1h-197zM23 239h83v1h-83zM23 155h196v2h-196zM24 240h81v1h-81zM24 157h195v1h-195zM25 241h79v1h-79zM25 158h194v2h-194zM26 242h76v1h-76zM26 160h194v1h-194zM27 243h74v1h-74zM27 161h193v2h-193zM28 244h72v1h-72zM28 163h192v1h-192zM29 245h69v1h-69zM29 164h191v1h-191zM30 165h190v1h-190zM31 246h66v1h-66zM31 166h189v1h-189zM32 247h63v1h-63zM32 167h188v1h-188zM33 248h61v1h-61zM33 168h187v1h-187zM34 169h186v1h-186zM35 249h57v1h-57zM35 170h78v1h-78zM36 250h54v1h-54zM36 171h73v1h-73zM37 172h70v1h-70zM38 251h50v1h-50zM38 173h66v1h-66zM40 252h46v1h-46zM40 174h61v1h-61zM41 175h58v1h-58zM42 253h42v1h-42zM43 176h53v1h-53zM45 254h35v1h-35zM45 177h49v1h-49zM46 178h45v1h-45zM48 255h29v1h-29zM49 179h39v1h-39zM49 81h121v1h-121zM51 180h34v1h-34zM55 256h16v1h-16zM55 181h26v1h-26zM56 80h111v1h-111zM59 182h16v1h-16zM59 79h62v1h-62zM62 78h55v1h-55zM64 77h51v1h-51zM65 76h49v1h-49zM67 75h46v1h-46zM69 74h44v1h-44zM70 73h43v1h-43zM72 72h41v1h-41zM73 71h40v1h-40zM74 70h39v1h-39zM75 69h38v1h-38zM76 68h37v1h-37zM76 212h53v1h-53zM77 67h36v1h-36zM78 66h36v1h-36zM80 65h34v1h-34zM81 64h33v1h-33zM81 63h34v1h-34zM81 211h49v1h-49zM82 62h33v1h-33zM83 61h33v1h-33zM84 60h33v1h-33zM84 210h47v1h-47zM85 59h32v1h-32zM85 58h33v1h-33zM86 57h33v1h-33zM86 209h46v1h-46zM87 56h33v1h-33zM88 55h33v1h-33zM88 208h44v1h-44zM89 54h33v1h-33zM90 53h33v1h-33zM90 52h34v1h-34zM90 207h43v1h-43zM91 51h35v1h-35zM92 50h35v1h-35zM92 206h42v1h-42zM93 49h36v1h-36zM94 48h38v1h-38zM94 47h41v1h-41zM94 205h41v1h-41zM95 204h41v1h-41zM95 46h119v1h-119zM96 45h118v1h-118zM97 203h39v1h-39zM97 43h116v2h-116zM98 202h39v1h-39zM98 42h114v1h-114zM99 201h39v1h-39zM99 41h113v1h-113zM100 39h111v1h-111zM100 40h112v1h-112zM101 200h38v1h-38zM101 38h110v1h-110zM102 199h38v1h-38zM102 37h108v1h-108zM103 198h38v1h-38zM103 36h107v1h-107zM104 197h38v1h-38zM104 35h105v1h-105zM105 196h38v1h-38zM105 33h103v1h-103zM105 34h104v1h-104zM106 195h37v1h-37zM106 32h101v1h-101zM107 194h38v1h-38zM107 31h100v1h-100zM108 193h38v1h-38zM108 30h98v1h-98zM109 192h38v1h-38zM109 28h96v1h-96zM109 29h97v1h-97zM110 191h38v1h-38zM110 190h39v1h-39zM110 27h94v1h-94zM111 189h39v1h-39zM111 26h93v1h-93zM112 188h40v1h-40zM112 25h91v1h-91zM113 187h40v1h-40zM113 186h42v1h-42zM113 23h88v1h-88zM113 24h89v1h-89zM114 185h43v1h-43zM114 22h87v1h-87zM115 184h44v1h-44zM115 183h46v1h-46zM115 21h85v1h-85zM116 182h48v1h-48zM116 181h54v1h-54zM116 20h83v1h-83zM116 170h104v1h-104zM117 19h81v1h-81zM117 179h99v2h-99zM118 18h79v1h-79zM118 178h99v1h-99zM118 176h100v2h-100zM118 173h101v1h-101zM118 175h101v1h-101zM118 171h102v2h-102zM119 17h77v1h-77zM119 174h100v1h-100zM120 15h74v1h-74zM120 16h75v1h-75zM121 14h72v1h-72zM122 13h69v1h-69zM124 12h66v1h-66zM125 11h64v1h-64zM126 79h38v1h-38zM126 10h61v1h-61zM127 9h59v1h-59zM128 8h56v1h-56zM129 7h53v1h-53zM131 6h50v1h-50zM132 5h46v1h-46zM134 78h26v1h-26zM134 4h42v1h-42zM136 3h38v1h-38zM138 2h32v1h-32zM140 1h27v1h-27zM141 77h13v1h-13zM145 0h16v1h-16zM150 47h64v1h-64zM154 48h61v1h-61zM157 49h58v1h-58zM160 50h55v1h-55zM162 51h54v1h-54zM164 52h52v1h-52zM166 53h50v1h-50zM167 54h49v1h-49zM169 55h48v1h-48zM171 56h46v1h-46zM172 57h45v1h-45zM173 58h44v1h-44zM174 59h43v1h-43zM175 181h39v1h-39zM176 60h41v1h-41zM177 61h40v1h-40zM178 62h39v1h-39zM179 63h38v1h-38zM180 64h37v1h-37zM181 65h36v1h-36zM182 182h31v1h-31zM182 66h35v1h-35zM183 67h34v1h-34zM184 68h33v1h-33zM186 69h31v1h-31zM187 70h29v1h-29zM188 183h23v1h-23zM188 71h28v1h-28zM189 72h27v1h-27zM190 73h25v1h-25zM192 74h23v1h-23zM193 75h21v1h-21zM194 76h19v1h-19zM195 184h12v1h-12zM196 77h17v1h-17zM197 78h15v1h-15zM199 79h12v1h-12zM201 80h8v1h-8zM205 81h1v1h-1z`;

function sLogo(color: string) {
  return `<svg viewBox="0 0 220 257" width="32" height="37" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;"><path d="${S_PATH}" fill="${color}"/></svg>`;
}

function emailHeader(accentColor = "#14110F") {
  return `
    <div style="display: flex; align-items: center; margin-bottom: 28px; gap: 10px;">
      ${sLogo(accentColor)}
      <span style="font-size: 18px; font-weight: 900; color: #14110F; letter-spacing: -0.02em;">Stretchy</span>
    </div>
  `;
}

function emailFooter() {
  return `
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E0D8CE;">
      <p style="font-size: 12px; color: #888; text-align: center; margin: 0 0 12px; line-height: 1.5;">
        Questions? <a href="mailto:kimberley@stretchyyoga.co.nz" style="color: #14110F; font-weight: 600; text-decoration: none;">kimberley@stretchyyoga.co.nz</a>
      </p>
      <p style="font-size: 12px; color: #888; text-align: center; margin: 0 0 8px;">
        <a href="https://www.instagram.com/stretchy.yoga/" style="color: #888; text-decoration: none; margin: 0 6px;">@stretchy.yoga</a>
        ·
        <a href="https://www.instagram.com/stretchy.social/" style="color: #888; text-decoration: none; margin: 0 6px;">@stretchy.social</a>
      </p>
      <p style="font-size: 11px; color: #AAA; text-align: center; margin: 0 0 12px;">
        Made with Love by <a href="https://studiodawn.org" style="color: #AAA; text-decoration: underline;">Studio Dawn</a>
      </p>
      <p style="font-size: 12px; color: #888; text-align: center; margin: 0 0 12px;">
        <a href="https://stretchyyoga.co.nz" style="color: #888; text-decoration: none;">stretchyyoga.co.nz</a>
      </p>
      <p style="font-size: 11px; color: #BBB; text-align: center; margin: 0;">Stretchy Social Movement Club · Built in Aotearoa 🌿</p>
    </div>
  `;
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

function holdConfirmedEmail(
  name: string,
  sessionTitle: string,
  date: string,
  price: string,
  venue: string,
  socialStretchVenue: string,
  cancelUrl: string
) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #F7F0E8; padding: 32px; border-radius: 16px;">
      ${emailHeader("#14110F")}

      <h1 style="font-size: 30px; font-weight: 900; color: #14110F; margin: 0 0 6px; letter-spacing: -0.02em;">You're in. 🙌</h1>
      <p style="color: #555; font-size: 15px; margin: 0 0 24px; line-height: 1.5;">Hey ${name} — your spot is held. Get excited! 🧘</p>

      <div style="background: #14110F; border-radius: 14px; padding: 22px; margin-bottom: 16px;">
        <p style="color: #FCBB16; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 6px;">Your Stretchy</p>
        <p style="color: #F7F0E8; font-size: 20px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.01em;">${sessionTitle}</p>
        <p style="color: rgba(245,237,227,0.7); font-size: 14px; margin: 0 0 4px;">🗓 ${date}</p>
        <p style="color: rgba(245,237,227,0.7); font-size: 14px; margin: 0 0 4px;">📍 ${venue}</p>
        <p style="color: rgba(245,237,227,0.6); font-size: 13px; margin: 8px 0 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">🥂 Social Stretch after at ${socialStretchVenue}</p>
      </div>

      <div style="background: white; border-radius: 14px; padding: 18px; margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #999; margin: 0 0 4px;">Current price</p>
        <p style="font-size: 30px; font-weight: 900; color: #14110F; margin: 0 0 4px; letter-spacing: -0.02em;">${price}</p>
        <p style="font-size: 12px; color: #999; margin: 0; line-height: 1.5;">Price drops as more people hold their place. Your card is charged 2 hours before the session.</p>
      </div>

      <div style="background: #EDE5D8; border-radius: 14px; padding: 18px; margin-bottom: 20px;">
        <p style="font-size: 13px; color: #444; line-height: 1.6; margin: 0 0 12px;">Need to cancel? You can cancel <strong>up to 36 hours before the session</strong> and nothing will be charged. After the 36hr mark, your place is locked in — no cancellations.</p>
        <a href="${cancelUrl}" style="display: inline-block; background: #14110F; color: #F7F0E8; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 20px; border-radius: 8px; letter-spacing: 0.02em;">Cancel my hold</a>
      </div>

      <p style="font-size: 13px; color: #888; line-height: 1.6; margin: 0;">Your card is charged at the final price <strong>2 hours before the session</strong>. The more people who join, the lower the final price — so share it around.</p>

      ${emailFooter()}
    </div>
  `;
}

function priceLocketEmail(name: string, sessionTitle: string, date: string, finalPrice: string, venue: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #FCBB16; padding: 32px; border-radius: 16px;">
      ${emailHeader("#14110F")}
      <h1 style="font-size: 30px; font-weight: 900; color: #14110F; margin: 0 0 6px; letter-spacing: -0.02em;">Price locked. You're in. ✅</h1>
      <p style="color: #14110F; font-size: 15px; margin: 0 0 24px; line-height: 1.5; opacity: 0.75;">Hey ${name} — the room is set. Your card has been charged at the final price.</p>
      <div style="background: #14110F; border-radius: 14px; padding: 22px; margin-bottom: 16px;">
        <p style="color: #FCBB16; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 6px;">Final price · charged now</p>
        <p style="color: white; font-size: 36px; font-weight: 900; margin: 0 0 8px; letter-spacing: -0.02em;">${finalPrice}</p>
        <p style="color: #F7F0E8; font-size: 18px; font-weight: 800; margin: 0 0 6px;">${sessionTitle}</p>
        <p style="color: rgba(245,237,227,0.7); font-size: 14px; margin: 0 0 4px;">🗓 ${date}</p>
        <p style="color: rgba(245,237,227,0.7); font-size: 14px; margin: 0;">📍 ${venue}</p>
      </div>
      <p style="font-size: 13px; color: rgba(26,26,26,0.7); line-height: 1.6; margin: 0 0 16px;">Doors close in 2 hours. See you on the mat. 🧘</p>
      ${emailFooter()}
    </div>
  `;
}

function sessionGoingAheadEmail(
  name: string,
  sessionTitle: string,
  date: string,
  finalPrice: string,
  venue: string,
  socialStretchVenue: string,
  notificationUrl?: string
) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #F7F0E8; padding: 32px; border-radius: 16px;">
      ${emailHeader("#716F39")}

      <h1 style="font-size: 30px; font-weight: 900; color: #14110F; margin: 0 0 6px; letter-spacing: -0.02em;">It's happening. ✅</h1>
      <p style="color: #555; font-size: 15px; margin: 0 0 24px; line-height: 1.5;">Hey ${name} — this one's going ahead. See you on the mat! 🤙</p>

      <div style="background: #716F39; border-radius: 14px; padding: 22px; margin-bottom: 16px;">
        <p style="color: rgba(255,255,255,0.65); font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 6px;">Confirmed</p>
        <p style="color: white; font-size: 20px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.01em;">${sessionTitle}</p>
        <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0 0 4px;">🗓 ${date}</p>
        <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0 0 4px;">📍 ${venue}</p>
        <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 8px 0 0; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;">🥂 Social Stretch after at ${socialStretchVenue}</p>
      </div>

      <div style="background: white; border-radius: 14px; padding: 18px; margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #999; margin: 0 0 4px;">Final price</p>
        <p style="font-size: 30px; font-weight: 900; color: #14110F; margin: 0 0 4px; letter-spacing: -0.02em;">${finalPrice}</p>
        <p style="font-size: 12px; color: #999; margin: 0;">Charged to your card 2 hours before the session at this final price. No surprises.</p>
      </div>

      <p style="font-size: 13px; color: #888; line-height: 1.6; margin: 0 0 16px;">Stick around after for the Social Stretch — coffee, matcha, booch, beers and actual conversation. That's the whole point.</p>
      ${notificationUrl ? `<a href="${notificationUrl}" style="display: inline-block; background: #716F39; color: #F7F0E8; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 22px; border-radius: 8px;">View your session →</a>` : ""}

      ${emailFooter()}
    </div>
  `;
}

function sessionCancelledEmail(name: string, sessionTitle: string, date: string, notificationUrl?: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #F7F0E8; padding: 32px; border-radius: 16px;">
      ${emailHeader("#14110F")}

      <h1 style="font-size: 30px; font-weight: 900; color: #14110F; margin: 0 0 6px; letter-spacing: -0.02em;">Not this time. 💙</h1>
      <p style="color: #555; font-size: 15px; margin: 0 0 24px; line-height: 1.5;">Hey ${name} — unfortunately this one didn't get enough holds to go ahead. Nothing was charged. 💛</p>

      <div style="background: #14110F; border-radius: 14px; padding: 22px; margin-bottom: 20px;">
        <p style="color: rgba(255,255,255,0.4); font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 6px;">Cancelled</p>
        <p style="color: #F7F0E8; font-size: 20px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.01em;">${sessionTitle}</p>
        <p style="color: rgba(245,237,227,0.5); font-size: 14px; margin: 0;">🗓 ${date}</p>
      </div>

      <div style="background: white; border-radius: 14px; padding: 18px; margin-bottom: 20px;">
        <p style="font-size: 14px; font-weight: 700; color: #14110F; margin: 0 0 4px;">Nothing was charged. ✓</p>
        <p style="font-size: 13px; color: #888; margin: 0; line-height: 1.5;">Your hold has been fully released. Your card was never touched.</p>
      </div>

      <p style="font-size: 13px; color: #888; line-height: 1.6; margin: 0 0 8px;">The more people who join, the better the price gets for everyone — and the more sessions go ahead. Keep an eye out for what's next.</p>

      <a href="${notificationUrl ?? "https://stretchyyoga.co.nz/sessions"}" style="display: inline-block; background: #14110F; color: #F7F0E8; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 22px; border-radius: 8px; margin-top: 12px; letter-spacing: 0.02em;">See upcoming sessions →</a>

      ${emailFooter()}
    </div>
  `;
}

function holdCancelledEmail(name: string, sessionTitle: string, date: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #F7F0E8; padding: 32px; border-radius: 16px;">
      ${emailHeader("#14110F")}

      <h1 style="font-size: 30px; font-weight: 900; color: #14110F; margin: 0 0 6px; letter-spacing: -0.02em;">Hold cancelled. 👋</h1>
      <p style="color: #555; font-size: 15px; margin: 0 0 24px; line-height: 1.5;">Hey ${name} — your hold has been cancelled as requested.</p>

      <div style="background: #14110F; border-radius: 14px; padding: 22px; margin-bottom: 16px;">
        <p style="color: rgba(255,255,255,0.4); font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 6px;">Cancelled</p>
        <p style="color: #F7F0E8; font-size: 20px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.01em;">${sessionTitle}</p>
        <p style="color: rgba(245,237,227,0.5); font-size: 14px; margin: 0;">🗓 ${date}</p>
      </div>

      <div style="background: white; border-radius: 14px; padding: 18px; margin-bottom: 20px;">
        <p style="font-size: 14px; font-weight: 700; color: #14110F; margin: 0 0 4px;">Nothing was charged. ✓</p>
        <p style="font-size: 13px; color: #888; margin: 0; line-height: 1.5;">Your card authorisation has been fully released. Your spot has been freed back to the group.</p>
      </div>

      <p style="font-size: 13px; color: #888; line-height: 1.6; margin: 0 0 12px;">Changed your mind? There's still time to grab another spot if the session hasn't hit the 36-hour mark. 🧘</p>
      <a href="https://stretchyyoga.co.nz/sessions" style="display: inline-block; background: #14110F; color: #F7F0E8; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 22px; border-radius: 8px; margin-top: 4px;">Browse sessions →</a>

      ${emailFooter()}
    </div>
  `;
}

// ─── API HANDLER ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  try {
    const {
      type, to, name, sessionTitle, date, price, venue,
      socialStretchVenue, cancelUrl, sessionId
    } = await request.json();
    const appUrl = "https://stretchyyoga.co.nz";

    if (!type || !to) {
      return NextResponse.json({ error: "Missing type or to" }, { status: 400 });
    }

    let subject = "";
    let html = "";

    switch (type) {
      case "hold_confirmed":
        subject = `You're in — ${sessionTitle}`;
        html = holdConfirmedEmail(
          name, sessionTitle, date, price,
          venue || "TBC",
          socialStretchVenue || "nearby",
          cancelUrl || "https://stretchyyoga.co.nz/my-holds"
        );
        break;
      case "session_going_ahead":
        subject = `It's happening — ${sessionTitle}`;
        html = sessionGoingAheadEmail(
          name, sessionTitle, date, price,
          venue || "TBC",
          socialStretchVenue || "nearby",
          sessionId ? `${appUrl}/notifications/going-ahead?session=${sessionId}` : `${appUrl}/sessions`
        );
        break;
      case "session_cancelled":
        subject = `Not this time — ${sessionTitle}`;
        html = sessionCancelledEmail(name, sessionTitle, date,
          sessionId ? `${appUrl}/notifications/cancelled?session=${sessionId}` : `${appUrl}/sessions`
        );
        break;
      case "price_locked":
        subject = `Price locked — you're in for ${sessionTitle}`;
        html = priceLocketEmail(name, sessionTitle, date, price, venue || "TBC");
        break;
      case "hold_cancelled":
        subject = `Hold cancelled — ${sessionTitle}`;
        html = holdCancelledEmail(name, sessionTitle, date);
        break;
      default:
        return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
    }

    // Strip HTML tags for plain text fallback
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, "\n")
      .trim();

    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      reply_to: REPLY_TO,
      subject,
      html,
      text,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "High",
        "Precedence": "bulk",
      },
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
