import { requireSession } from "@/lib/session";
import { getChatReads, getCouple, getRecentMessages } from "@/lib/data";
import { ChatRoom } from "@/components/chat-room";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const profile = await requireSession();
  const [couple, msgs, reads] = await Promise.all([
    getCouple(),
    getRecentMessages(200),
    getChatReads(),
  ]);

  const meName = profile === "him" ? couple.himName : couple.herName;
  const partnerName = profile === "him" ? couple.herName : couple.himName;

  return (
    <ChatRoom
      profile={profile}
      meName={meName}
      partnerName={partnerName}
      initial={msgs.map((m) => ({
        id: m.id,
        profile: m.profile,
        text: m.text,
        kind: m.kind === "signal" ? "signal" : "text",
        createdAt: m.createdAt.toISOString(),
        editedAt: m.editedAt ? m.editedAt.toISOString() : null,
        pinnedAt: m.pinnedAt ? m.pinnedAt.toISOString() : null,
        pinnedBy: m.pinnedBy,
      }))}
      initialReads={reads}
    />
  );
}
