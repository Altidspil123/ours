import { requireSession } from "@/lib/session";
import { Hideaway } from "@/components/hideaway";

export const dynamic = "force-dynamic";

export default async function HideawayPage() {
  await requireSession();
  return <Hideaway />;
}
