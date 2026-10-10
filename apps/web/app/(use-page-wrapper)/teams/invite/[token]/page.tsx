import type { Metadata } from "next";
import { Suspense } from "react";

import { _generateMetadata } from "app/_utils";

import InviteView from "~/teams/invite-view";

export const generateMetadata = async (): Promise<Metadata> => {
  const metadata = await _generateMetadata(
    (t) => t("team_invitation_title"),
    (t) => t("team_invitation_description"),
    undefined,
    undefined,
    "/teams/invite"
  );
  return {
    ...metadata,
    robots: {
      index: false,
      follow: false,
    },
  };
};

const ServerPage = () => (
  <Suspense fallback={null}>
    <InviteView />
  </Suspense>
);

export default ServerPage;
