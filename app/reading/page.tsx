import type { Metadata } from "next";
import ReadingShell from "@/app/components/reading/reading-shell";

export const metadata: Metadata = {
  title: "Reading Room — ShapeLLM",
  description:
    "A text is not a point, it is a trajectory. ShapeLLM performs a long text in beats: voice, evidence, colour, and a body that changes with the arc.",
};

export default function ReadingPage() {
  return <ReadingShell />;
}
