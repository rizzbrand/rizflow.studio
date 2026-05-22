import { redirect } from "next/navigation";

/** Legacy URL; the create workspace lives at `/create`. */
export default function HomeRedirectPage() {
  redirect("/create");
}
