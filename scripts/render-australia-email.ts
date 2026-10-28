// Renders the Stretchy Australia welcome email to docs/australia-emails/ for review.
//   npx tsx scripts/render-australia-email.ts
import { writeFileSync } from "fs";
import { renderAuWelcome } from "@/lib/australiaEmails";
const { subject, html } = renderAuWelcome("Sophie Berry");
writeFileSync("docs/australia-emails/welcome.html", `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title><body style="margin:0">${html}</body>`);
console.log(subject);
