import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import TeamsViewWrapper from "~/settings/teams/teams-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("team_settings_description"),
    undefined,
    undefined,
    "/settings/teams"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("teams")} description={t("team_settings_description")} borderInShellHeader={true}>
      <TeamsViewWrapper />
    </SettingsHeader>
  );
};

export default Page;
