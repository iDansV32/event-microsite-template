import { z } from "zod";

/**
 * Image slot used across pages (overview, hotel, agenda). `src` is optional
 * because asset files still live under /public/images for this demo; the
 * field stays in place for the Supabase Storage migration in M2 (resolved
 * via lib/assets.ts, same shape). `alt` is required so accessibility never
 * silently regresses.
 */
export const ImageSlot = z.object({
  src: z.string().min(1).optional(),
  alt: z.string().min(1),
  label: z.string().optional(),
});

export type ImageSlot = z.infer<typeof ImageSlot>;
