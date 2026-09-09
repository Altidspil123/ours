import { requireSession } from "@/lib/session";
import { getCouple } from "@/lib/data";
import { SettingsPanel } from "@/components/settings-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await requireSession();
  const couple = await getCouple();

  return (
    <SettingsPanel
      profile={profile}
      couple={{
        himName: couple.himName,
        herName: couple.herName,
        anniversary: couple.anniversary,
      }}
    />
  );
}
