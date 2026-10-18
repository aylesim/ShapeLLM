import type { Metadata } from "next";
import { SpecimensGrid } from "@/app/components/specimens/specimens-grid";

export const metadata: Metadata = {
  title: "Specimens — ShapeLLM",
  description:
    "A cabinet of readings: six texts, six shapes, six sets of evidence.",
};

export default function SpecimensPage() {
  return <SpecimensGrid />;
}
