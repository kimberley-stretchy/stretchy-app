// Writes the applicant "we've got it" emails to docs/applicant-emails/ to read.
import { writeFileSync } from "fs";
import { renderApplicantEmail } from "../lib/applicantEmail";
for (const t of ["gem", "teacher", "venue"]) {
  const e = renderApplicantEmail(t, "Amelia Example")!;
  writeFileSync(`docs/applicant-emails/${t}.html`, e.html);
  console.log(`${t}: ${e.subject}`);
}
