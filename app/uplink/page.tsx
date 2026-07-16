import type { Metadata } from "next";
import { UplinkWorkspace } from "@/components/studio/uplink/UplinkWorkspace";

export const metadata: Metadata = {
  title: "Uplink",
  description:
    "Live community chat for musicians, producers, and creatives on Rizflow.",
};

export default function UplinkPage() {
  return <UplinkWorkspace />;
}
