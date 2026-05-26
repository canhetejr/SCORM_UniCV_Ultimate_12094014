import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vitrine = await prisma.vitrine.findFirst({
    where: { slug, status: "ACTIVE" },
  });
  if (!vitrine) return { title: "Não encontrado" };
  return {
    title: vitrine.title,
    description: vitrine.description ?? undefined,
    openGraph: { title: vitrine.title, description: vitrine.description ?? undefined },
  };
}

export default async function PublishedVitrinePage({ params }: Props) {
  const { slug } = await params;
  const vitrine = await prisma.vitrine.findFirst({
    where: { slug, status: "ACTIVE" },
    include: { videos: { orderBy: { position: "asc" }, include: { video: true } } },
  });

  if (!vitrine) notFound();

  const base = process.env.PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const videos = vitrine.videos.map((vv) => ({
    id: vv.video.vimeoVideoId,
    title: vv.video.title,
    thumb: vv.video.thumbnailUrl,
    duration: vv.video.durationSec,
    hash: vv.video.embedHash,
  }));

  const configScript = `window.__UNICV_CONFIG=${JSON.stringify({
    vitrine_id: vitrine.id,
    api_base: base,
    xapi_url: `${base}/api/xapi/statements`,
    videos,
  })};`;

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{vitrine.title}</title>
        {vitrine.description && <meta name="description" content={vitrine.description} />}
        <script dangerouslySetInnerHTML={{ __html: configScript }} />
        <link rel="stylesheet" href="/player/style.css" />
      </head>
      <body>
        <div id="root" />
        <script src="/player/player.js" />
      </body>
    </html>
  );
}
