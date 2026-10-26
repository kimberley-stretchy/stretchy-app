// Renders the "Welcome to the team" email to docs/team-welcome-email/ for review.
//   npx tsx scripts/render-team-welcome.ts
import { writeFileSync } from "fs";
import { renderTeamWelcome } from "@/lib/teamWelcomeEmail";

for (const [file, roles] of [["teacher", ["teacher"]], ["gem", ["gem"]], ["teacher-and-gem", ["teacher", "gem"]]] as const) {
  const { subject, html } = renderTeamWelcome({ name: "Sophie Berry", email: "sophie@example.com", roles: [...roles] });
  writeFileSync(`docs/team-welcome-email/${file}.html`, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title><body style="margin:0">${html}</body>`);
  console.log(`${file}: ${subject}`);
}
