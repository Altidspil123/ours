import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

export type Phase =
  | "menstrual"
  | "follicular"
  | "ovulation"
  | "luteal"
  | "late"
  | null;

export interface FertileWindow {
  start: string;
  end: string;
  ovulation: string;
}

export interface CyclePrediction {
  hasData: boolean;
  lastStart: string | null;
  currentDay: number | null; // 1-based, may exceed cycleLength when late
  cycleLength: number; // effective length used for predictions
  periodLength: number;
  averageCycle: number | null; // computed from logs (null when < 2 logs)
  nextPeriodStart: string | null;
  daysUntilPeriod: number | null; // negative → late by abs() days
  ovulationDate: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  phase: Phase;
  predictedStarts: string[]; // next 3 predicted period start dates
  fertileWindows: FertileWindow[]; // current + next cycles
}

export const iso = (d: Date): string => format(d, "yyyy-MM-dd");

/** Average distance between consecutive period starts (last 6 cycles). */
export function averageCycleLength(starts: string[]): number | null {
  const sorted = [...starts].sort();
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff = differenceInCalendarDays(
      parseISO(sorted[i]),
      parseISO(sorted[i - 1]),
    );
    if (diff >= 15 && diff <= 90) diffs.push(diff);
  }
  if (diffs.length === 0) return null;
  const recent = diffs.slice(-6);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  return Math.round(mean);
}

export function predictCycle(
  starts: string[],
  opts: {
    cycleLength: number;
    periodLength: number;
    autoCycle: boolean;
    today?: Date;
  },
): CyclePrediction {
  const today = opts.today ?? new Date();
  const avg = averageCycleLength(starts);
  const cycleLength = clamp(
    opts.autoCycle && avg ? avg : opts.cycleLength,
    18,
    60,
  );
  const periodLength = clamp(opts.periodLength, 2, 10);

  const empty: CyclePrediction = {
    hasData: false,
    lastStart: null,
    currentDay: null,
    cycleLength,
    periodLength,
    averageCycle: avg,
    nextPeriodStart: null,
    daysUntilPeriod: null,
    ovulationDate: null,
    fertileStart: null,
    fertileEnd: null,
    phase: null,
    predictedStarts: [],
    fertileWindows: [],
  };

  if (!starts.length) return empty;

  const sorted = [...starts].sort();
  const lastStart = sorted[sorted.length - 1];
  const lastStartDate = parseISO(lastStart);
  const currentDay = differenceInCalendarDays(today, lastStartDate) + 1;

  const nextPeriodDate = addDays(lastStartDate, cycleLength);
  const nextPeriodStart = iso(nextPeriodDate);
  const daysUntilPeriod = differenceInCalendarDays(nextPeriodDate, today);

  // Ovulation ≈ 14 days before the expected next period.
  const ovulationDate = addDays(nextPeriodDate, -14);
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = addDays(ovulationDate, 1);
  const ovulationDayIndex = cycleLength - 14; // 1-based day within the cycle

  let phase: Phase = null;
  if (currentDay > cycleLength) {
    phase = "late";
  } else if (currentDay <= periodLength) {
    phase = "menstrual";
  } else if (
    currentDay >= ovulationDayIndex - 1 &&
    currentDay <= ovulationDayIndex + 1
  ) {
    phase = "ovulation";
  } else if (currentDay < ovulationDayIndex - 1) {
    phase = "follicular";
  } else {
    phase = "luteal";
  }

  const predictedStarts = [0, 1, 2].map((i) =>
    iso(addDays(nextPeriodDate, i * cycleLength)),
  );

  const fertileWindows: FertileWindow[] = [0, 1, 2].map((i) => {
    const start = addDays(nextPeriodDate, i * cycleLength);
    const ov = addDays(start, -14);
    return {
      start: iso(addDays(ov, -5)),
      end: iso(addDays(ov, 1)),
      ovulation: iso(ov),
    };
  });

  return {
    hasData: true,
    lastStart,
    currentDay,
    cycleLength,
    periodLength,
    averageCycle: avg,
    nextPeriodStart,
    daysUntilPeriod,
    ovulationDate: iso(ovulationDate),
    fertileStart: iso(fertileStart),
    fertileEnd: iso(fertileEnd),
    phase,
    predictedStarts,
    fertileWindows,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export const PHASE_META: Record<
  Exclude<Phase, null>,
  { label: string; hint: string; color: string }
> = {
  menstrual: {
    label: "Menstrual",
    hint: "Warmth, rest and extra tenderness. Heating pad duty is sacred.",
    color: "#e0577b",
  },
  follicular: {
    label: "Follicular",
    hint: "Energy rising. Great days for adventures and trying new things.",
    color: "#e8b25c",
  },
  ovulation: {
    label: "Ovulation",
    hint: "Peak energy and magnetism. Handle with… enthusiasm.",
    color: "#b48ce2",
  },
  luteal: {
    label: "Luteal",
    hint: "Winding down. Comfort food, patience and no taking moods personally.",
    color: "#d97f63",
  },
  late: {
    label: "Later than expected",
    hint: "The calendar says the guest is overdue. Log the new period when it starts — and keep snacks ready.",
    color: "#e0577b",
  },
};
