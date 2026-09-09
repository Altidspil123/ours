import { differenceInCalendarDays, isToday, isTomorrow, parseISO } from "date-fns";
import { requireSession } from "@/lib/session";
import {
  getCouple,
  getCycleData,
  getEventsWithItems,
  getMemories,
  getRecentDraws,
  getRecentMessages,
} from "@/lib/data";
import { PHASE_META, iso } from "@/lib/cycle";
import { promptOfTheDay } from "@/lib/types";
import { Dashboard } from "@/components/dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await requireSession();
  const [couple, cycle, events, recent, memories, draws] = await Promise.all([
    getCouple(),
    getCycleData(),
    getEventsWithItems(),
    getRecentMessages(3),
    getMemories(),
    getRecentDraws(1),
  ]);

  const today = new Date();
  const todayIso = iso(today);

  const daysTogether = couple.anniversary
    ? differenceInCalendarDays(today, parseISO(couple.anniversary))
    : null;

  const upcoming = events
    .filter((e) => e.date >= todayIso)
    .sort((a, b) =>
      `${a.date}T${a.time ?? "23:59"}`.localeCompare(
        `${b.date}T${b.time ?? "23:59"}`,
      ),
    )[0];

  const lastMessage = recent[recent.length - 1] ?? null;
  const lastDraw = draws[0] ?? null;

  const meName = profile === "him" ? couple.himName : couple.herName;
  const partnerName = profile === "him" ? couple.herName : couple.himName;

  return (
    <Dashboard
      profile={profile}
      meName={meName}
      partnerName={partnerName}
      himName={couple.himName}
      herName={couple.herName}
      anniversary={couple.anniversary}
      daysTogether={daysTogether}
      prompt={promptOfTheDay()}
      cycle={{
        hasData: cycle.prediction.hasData,
        currentDay: cycle.prediction.currentDay,
        daysUntilPeriod: cycle.prediction.daysUntilPeriod,
        phaseLabel: cycle.prediction.phase
          ? PHASE_META[cycle.prediction.phase].label
          : null,
        phaseColor: cycle.prediction.phase
          ? PHASE_META[cycle.prediction.phase].color
          : null,
      }}
      nextEvent={
        upcoming
          ? {
              id: upcoming.id,
              title: upcoming.title,
              date: upcoming.date,
              time: upcoming.time,
              color: upcoming.color,
              daysAway: differenceInCalendarDays(parseISO(upcoming.date), today),
              isToday: isToday(parseISO(upcoming.date)),
              isTomorrow: isTomorrow(parseISO(upcoming.date)),
              doneItems: upcoming.items.filter((i) => i.done).length,
              totalItems: upcoming.items.length,
            }
          : null
      }
      todayEventsCount={events.filter((e) => e.date === todayIso).length}
      lastMessage={
        lastMessage
          ? {
              text: lastMessage.text,
              profile: lastMessage.profile,
              createdAt: lastMessage.createdAt.toISOString(),
            }
          : null
      }
      memoriesCount={memories.length}
      latestMemory={
        memories[0]
          ? { imageUrl: memories[0].imageUrl, caption: memories[0].caption }
          : null
      }
      lastDraw={
        lastDraw
          ? { title: lastDraw.title, intensity: lastDraw.intensity }
          : null
      }
    />
  );
}
