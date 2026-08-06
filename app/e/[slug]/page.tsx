import { notFound, redirect } from "next/navigation";
import { loadEvent } from "@/lib/content";

export default async function EventRootPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { meta } = loadEvent(slug);
  const first = meta.enabledSections[0];
  if (!first) notFound();
  redirect(`/e/${slug}/${first}`);
}
