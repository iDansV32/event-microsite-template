import {
  Source_Serif_4,
  Inter,
  Caveat,
  JetBrains_Mono,
  Playfair_Display,
  Lora,
  Manrope,
  DM_Sans,
  IBM_Plex_Serif,
} from "next/font/google";
import type { FontKey } from "./schemas/theme";

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

type FontEntry = {
  className: string;
  familyStack: string;
};

const SYSTEM_SANS: FontEntry = {
  className: "",
  familyStack:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const SYSTEM_SERIF: FontEntry = {
  className: "",
  familyStack:
    'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
};

export const FONTS: Record<FontKey, FontEntry> = {
  "source-serif-4": { className: sourceSerif4.className, familyStack: "Source Serif 4, serif" },
  "inter": { className: inter.className, familyStack: "Inter, sans-serif" },
  "caveat": { className: caveat.className, familyStack: "Caveat, cursive" },
  "jetbrains-mono": { className: jetbrainsMono.className, familyStack: "JetBrains Mono, monospace" },
  "playfair-display": { className: playfair.className, familyStack: "Playfair Display, serif" },
  "lora": { className: lora.className, familyStack: "Lora, serif" },
  "manrope": { className: manrope.className, familyStack: "Manrope, sans-serif" },
  "dm-sans": { className: dmSans.className, familyStack: "DM Sans, sans-serif" },
  "ibm-plex-serif": { className: ibmPlexSerif.className, familyStack: "IBM Plex Serif, serif" },
  "system-sans": SYSTEM_SANS,
  "system-serif": SYSTEM_SERIF,
};

export function fontClassName(key: FontKey): string {
  return FONTS[key].className;
}

export function fontFamily(key: FontKey): string {
  return FONTS[key].familyStack;
}
