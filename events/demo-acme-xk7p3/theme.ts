import type { z } from "zod";
import type { Theme } from "@/lib/schemas";

// Clean, modern palette: white ground, deep navy text, cool slate neutrals
// and one purple accent. `terracotta` is the schema's accent slot.
export const theme = {
  colors: {
    bg: "#FFFFFF",
    paper: "#F5F6FA",
    ink: "#0E1325",
    inkMuted: "#545B6E",
    terracotta: "#5B4CF0",
    clay: "#E9E7F8",
    olive: "#1F7A5A",
    teal: "#2563EB",
    navy: "#0E1325",
    cream: "#F5F6FA",
  },
  fonts: {
    display: "inter",
    body: "inter",
  },
  logo: {},
} satisfies z.input<typeof Theme>;
