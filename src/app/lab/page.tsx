import type { Metadata } from "next";
import Lab from "@/components/Lab";

export const metadata: Metadata = {
  title: "Lab (prototype) — VerseOrder",
  robots: { index: false, follow: false },
};

export default function LabPage() {
  return <Lab />;
}
