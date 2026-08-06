import { notFound } from "next/navigation";
import { loadEvent } from "@/lib/content";
import { AgendaView } from "./AgendaView";

export default async function AgendaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { meta, content, agenda } = loadEvent(slug);
  if (!meta.enabledSections.includes("agenda") || !agenda) notFound();
  const cityShort = content.venue.cityShort ?? content.venue.city;
  const eyebrow = `${content.dates.displayShort} · ${content.venue.city.toUpperCase()}`;
  return (
    <AgendaView
      days={agenda.days}
      title={agenda.title}
      lede={agenda.lede}
      notice={agenda.notice}
      eyebrow={eyebrow}
      cityShort={cityShort}
    />
  );
}
