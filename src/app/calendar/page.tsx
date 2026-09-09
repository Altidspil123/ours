import { requireSession } from "@/lib/session";
import { getCouple, getCycleData, getEventsWithItems } from "@/lib/data";
import { CalendarBoard } from "@/components/calendar-board";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const profile = await requireSession();
  const [couple, events, cycle] = await Promise.all([
    getCouple(),
    getEventsWithItems(),
    getCycleData(),
  ]);

  return (
    <CalendarBoard
      profile={profile}
      meName={profile === "him" ? couple.himName : couple.herName}
      partnerName={profile === "him" ? couple.herName : couple.himName}
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        notes: e.notes,
        color: e.color,
        createdBy: e.createdBy,
        items: e.items.map((i) => ({ id: i.id, text: i.text, done: i.done })),
      }))}
      prediction={{
        hasData: cycle.prediction.hasData,
        predictedStarts: cycle.prediction.predictedStarts,
        periodLength: cycle.prediction.periodLength,
        fertileWindows: cycle.prediction.fertileWindows,
        daysUntilPeriod: cycle.prediction.daysUntilPeriod,
        nextPeriodStart: cycle.prediction.nextPeriodStart,
      }}
    />
  );
}
