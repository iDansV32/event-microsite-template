import type { CSSProperties } from "react";
import type { Theme } from "./schemas";

/**
 * Per-event CSS custom properties, as a map ready for a React `style` prop
 * on a scoped wrapper element. Consumers that only need subtree theming can
 * use this.
 */
export function themeToCSSVars(theme: Theme): CSSProperties {
  const c = theme.colors;
  return {
    "--bg": c.bg,
    "--paper": c.paper,
    "--ink": c.ink,
    "--ink-muted": c.inkMuted,
    "--terracotta": c.terracotta,
    "--clay": c.clay,
    "--olive": c.olive,
    "--teal": c.teal,
    "--navy": c.navy,
    "--cream": c.cream,

    // Derived — re-emitted because CSS var() substitution inside a
    // custom-property value resolves at the DEFINING element's compute time.
    "--ink-70": `color-mix(in srgb, ${c.ink} 70%, transparent)`,
    "--ink-55": `color-mix(in srgb, ${c.ink} 55%, transparent)`,
    "--ink-40": `color-mix(in srgb, ${c.ink} 40%, transparent)`,
    "--ink-12": `color-mix(in srgb, ${c.ink} 12%, transparent)`,
    "--ink-06": `color-mix(in srgb, ${c.ink} 6%, transparent)`,
    "--bg-deep": `color-mix(in srgb, ${c.bg} 92%, #000 8%)`,
    "--terracotta-deep": `color-mix(in srgb, ${c.terracotta} 85%, #000 15%)`,
    "--tint-clay": `color-mix(in srgb, ${c.clay} 45%, ${c.bg} 55%)`,
    "--tint-teal": `color-mix(in srgb, ${c.teal} 25%, ${c.bg} 75%)`,
    "--tint-blush": `color-mix(in srgb, ${c.terracotta} 22%, ${c.bg} 78%)`,
    "--tint-fog": `color-mix(in srgb, ${c.ink} 10%, ${c.bg} 90%)`,
  } as unknown as CSSProperties;
}

/**
 * Same token set, serialised as a `:root { … }` CSS ruleset. Rendered inside
 * an inline <style> tag in the /e/[slug] layout so the override reaches
 * HTML/BODY too — otherwise the page backdrop (and the dot pattern in
 * globals.css that reads var(--ink)) would stay on the root palette even
 * when the /e/[slug] subtree is themed.
 *
 * The layout mounts/unmounts this <style> with the page, so the override is
 * scoped to event routes — non-event pages fall back to globals.css defaults.
 *
 * All values here are Zod-validated hex colors (Theme schema), so even though
 * the string is injected via dangerouslySetInnerHTML, no unsanitised input
 * reaches CSS.
 */
export function themeToRootCSS(theme: Theme): string {
  const vars = themeToCSSVars(theme) as Record<string, string>;
  const rules = Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return `:root{${rules}}`;
}
