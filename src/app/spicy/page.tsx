import { requireSession } from "@/lib/session";
import { getCouple, getRecentDraws, getSpicyDeck } from "@/lib/data";
import { SpicyRoom } from "@/components/spicy-room";

export const dynamic = "force-dynamic";

export default async function SpicyPage() {
  const profile = await requireSession();
  const [couple, cards, draws] = await Promise.all([
    getCouple(),
    getSpicyDeck(),
    getRecentDraws(8),
  ]);

  return (
    <SpicyRoom
      profile={profile}
      meName={profile === "him" ? couple.himName : couple.herName}
      partnerName={profile === "him" ? couple.herName : couple.himName}
      cards={cards.map((c) => ({
        id: c.id,
        title: c.title,
        body: c.body,
        intensity: c.intensity,
        imageUrl: c.imageUrl,
      }))}
      draws={draws.map((d) => ({
        id: d.id,
        title: d.title,
        intensity: d.intensity,
        drawnBy: d.drawnBy,
        createdAt: d.createdAt.toISOString(),
      }))}
    />
  );
}
