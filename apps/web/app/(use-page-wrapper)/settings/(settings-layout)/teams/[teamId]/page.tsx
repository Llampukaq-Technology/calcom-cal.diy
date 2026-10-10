import { _generateMetadata, getTranslate } from "app/_utils";
import { redirect } from "next/navigation";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import TeamView from "~/settings/teams/[teamId]/team-view";

export const generateMetadata = async ({ params }: { params: Promise<{ teamId: string }> }) =>
  await _generateMetadata(
    (t) => t("team_info"),
    (t) => t("team_settings_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).teamId}`
  );

const Page = async ({ params }: { params: Promise<{ teamId: string }> }) => {
  const t = await getTranslate();
  const { teamId } = await params;
  const parsedTeamId = Number(teamId);

  if (!Number.isInteger(parsedTeamId) || parsedTeamId <= 0) {
    redirect("/settings/teams");
  }

  return (
    <SettingsHeader title={t("team_info")} description={t("team_settings_description")} borderInShellHeader={true}>
      <TeamView teamId={parsedTeamId} />
    </SettingsHeader>
  );
};

export default Page;
