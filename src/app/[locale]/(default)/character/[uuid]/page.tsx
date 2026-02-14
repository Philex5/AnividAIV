import { permanentRedirect } from "next/navigation";

interface CharacterDetailPageProps {
  params: Promise<{
    locale: string;
    uuid: string;
  }>;
}

// Redirect old /character/[uuid] route to new /characters/[uuid] route
export default async function CharacterDetailPage({
  params,
}: CharacterDetailPageProps) {
  const { locale, uuid } = await params;

  // 301 permanent redirect to the new route
  const newPath = locale && locale !== "en"
    ? `/${locale}/characters/${uuid}`
    : `/characters/${uuid}`;

  permanentRedirect(newPath);
}
