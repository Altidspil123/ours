import { requireSession } from "@/lib/session";
import { getCouple, getMemories } from "@/lib/data";
import { MemoriesWall } from "@/components/memories-wall";

export const dynamic = "force-dynamic";

export default async function MemoriesPage() {
  const profile = await requireSession();
  const [couple, memories] = await Promise.all([getCouple(), getMemories()]);

  return (
    <MemoriesWall
      profile={profile}
      meName={profile === "him" ? couple.himName : couple.herName}
      partnerName={profile === "him" ? couple.herName : couple.himName}
      initial={memories.map((m) => ({
        id: m.id,
        imageUrl: m.imageUrl,
        caption: m.caption,
        takenOn: m.takenOn,
        createdBy: m.createdBy,
      }))}
    />
  );
}
