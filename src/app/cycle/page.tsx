import { requireSession } from "@/lib/session";
import { getCouple, getCycleData } from "@/lib/data";
import { CycleView } from "@/components/cycle-view";

export const dynamic = "force-dynamic";

export default async function CyclePage() {
  const profile = await requireSession();
  const [couple, cycle] = await Promise.all([getCouple(), getCycleData()]);

  return (
    <CycleView
      herName={couple.herName}
      initial={{
        settings: {
          cycleLength: cycle.settings.cycleLength,
          periodLength: cycle.settings.periodLength,
          autoCycle: cycle.settings.autoCycle,
        },
        logs: cycle.logs,
        prediction: cycle.prediction,
      }}
    />
  );
}
