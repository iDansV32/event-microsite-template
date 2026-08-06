import type { z } from "zod";
import type { Theme } from "@/lib/schemas";

export const theme = {
  colors: {
    bg: "#F5F0E8",
    paper: "#FBF7F0",
    ink: "#1C2A24",
    inkMuted: "#4A5A50",
    terracotta: "#F15A29",
    clay: "#C85A3F",
    olive: "#7A8A5C",
    teal: "#2D7280",
    navy: "#1C3A4A",
    cream: "#F1F3F2",
  },
  fonts: {
    display: "source-serif-4",
    body: "inter",
    script: "caveat",
    mono: "jetbrains-mono",
  },
  logo: {},
} satisfies z.input<typeof Theme>;
