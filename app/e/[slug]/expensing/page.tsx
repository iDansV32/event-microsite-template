import { notFound } from "next/navigation";
import { loadEvent } from "@/lib/content";
import { ExpensingView } from "./ExpensingView";

export default async function ExpensingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { meta, content, expensing } = loadEvent(slug);
  if (!meta.enabledSections.includes("expensing") || !expensing) notFound();
  return (
    <ExpensingView
      brand={content.brand.client}
      slackChannel={content.contact?.slackChannel}
      covered={expensing.covered}
      notCovered={expensing.notCovered}
      submissionDeadline={expensing.submissionDeadline}
      travelToolUrl={expensing.travelToolUrl}
      howToSubmit={expensing.howToSubmit}
    />
  );
}
