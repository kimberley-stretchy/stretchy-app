import { redirect } from "next/navigation";

// The old dashboard only ever showed placeholder data. Teachers and GEMs use
// /host/home; anything still linking here lands there.
export default function HostDashboardRedirect() {
  redirect("/host/home");
}
