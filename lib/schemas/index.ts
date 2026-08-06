export * from "./meta";
export * from "./event";
export * from "./theme";
export * from "./image";
export * from "./agenda";
export * from "./faq";
export * from "./expensing";
export * from "./feedback";
export * from "./rsvp";
export * from "./invite";

import type { Meta } from "./meta";
import type { EventContent } from "./event";
import type { Theme } from "./theme";
import type { Agenda } from "./agenda";
import type { Faq } from "./faq";
import type { Expensing } from "./expensing";
import type { Feedback } from "./feedback";

export type EventBundle = {
  meta: Meta;
  content: EventContent;
  theme: Theme;
  agenda?: Agenda;
  faq?: Faq;
  expensing?: Expensing;
  feedback?: Feedback;
};
