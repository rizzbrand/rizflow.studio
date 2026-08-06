import { redirect } from "next/navigation";

/** Stem splitter lives in Studio → Stems tab. */
export default function StemSplitterPage() {
  redirect("/studio?tab=stems");
}
