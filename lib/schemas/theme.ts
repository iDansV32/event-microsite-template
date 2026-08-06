import { z } from "zod";

export const FONT_KEYS = [
  "source-serif-4",
  "inter",
  "caveat",
  "jetbrains-mono",
  "playfair-display",
  "lora",
  "manrope",
  "dm-sans",
  "ibm-plex-serif",
  "system-sans",
  "system-serif",
] as const;

export const FontKey = z.enum(FONT_KEYS);
export type FontKey = z.infer<typeof FontKey>;

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const hexColor = z.string().regex(HEX, "must be a hex color");

export const ThemeColors = z.object({
  bg: hexColor,
  paper: hexColor,
  ink: hexColor,
  inkMuted: hexColor,
  terracotta: hexColor,
  clay: hexColor,
  olive: hexColor,
  teal: hexColor,
  navy: hexColor,
  cream: hexColor,
});

export const AssetKey = z.string().min(1);
export type AssetKey = z.infer<typeof AssetKey>;

export const Theme = z.object({
  colors: ThemeColors,
  fonts: z.object({
    display: FontKey,
    body: FontKey,
    script: FontKey.optional(),
    mono: FontKey.optional(),
  }),
  logo: z.object({
    mark: AssetKey.optional(),
    full: AssetKey.optional(),
  }),
  hero: AssetKey.optional(),
});

export type Theme = z.infer<typeof Theme>;
export type ThemeColors = z.infer<typeof ThemeColors>;
