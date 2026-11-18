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

  const links: { href: string; label: string }[] = [];
  if (meta.enabledSections.includes("expensing")) {
    links.push({ href: `/e/${slug}/expensing`, label: "Expensing policy" });
  }
  if (meta.enabledSections.includes("hotel")) {
    links.push({ href: `/e/${slug}/hotel`, label: "Hotel & travel" });
  }

  return (
    <FaqView
      items={faq.items}
      eventName={content.brand.shortName}
      slackChannel={content.contact?.slackChannel}
      supportEmail={content.contact?.supportEmail}
      links={links}
    />
  );
}
