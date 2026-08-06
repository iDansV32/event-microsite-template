import { z } from "zod";

export const FaqItem = z.object({
  q: z.string().min(1),
  a: z.string().min(1),
});

export const Faq = z.object({
  items: z.array(FaqItem).min(1),
});

export type Faq = z.infer<typeof Faq>;
export type FaqItem = z.infer<typeof FaqItem>;
