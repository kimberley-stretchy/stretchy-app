import { redirect } from "next/navigation";

// The old session page only ever showed placeholder data. The real thing is the
// run sheet (who's coming, check-in, notices from HQ).
export default function HostSessionRedirect({ params }: { params: { id: string } }) {
  redirect(`/host/session/${params.id}/run-sheet`);
}
