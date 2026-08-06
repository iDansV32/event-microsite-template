import { notFound } from "next/navigation";
import { loadEvent } from "@/lib/content";
import { FaqView } from "./FaqView";

export default async function FaqPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { meta, content, faq } = loadEvent(slug);
  if (!meta.enabledSections.includes("faq") || !faq) notFound();
  return (
    <FaqView items={faq.items} slackChannel={content.contact?.slackChannel} />
  );
}
