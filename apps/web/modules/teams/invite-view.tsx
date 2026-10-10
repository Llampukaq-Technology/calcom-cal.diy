"use client";

import { useParams, useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Spinner } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import { useRedirectToLoginIfUnauthenticated } from "~/auth/hooks/useRedirectToLoginIfUnauthenticated";

/**
 * Team invite link acceptance page. Rendered at /teams/invite/[token].
 *
 * - Unauthenticated visitors are redirected to /auth/login with a callbackUrl back to
 *   this exact URL (token included), so a manual login returns them here.
 * - Authenticated visitors see an accept dialog; accepting calls
 *   viewer.teams.inviteMembershipByLink and lands them in /settings/teams.
 */
export default function InviteView() {
  const { t } = useLocale();
  const router = useRouter();
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : undefined;

  // Redirects unauthenticated users to /auth/login?callbackUrl=<this page> and
  // returns { loading, session } so we don't flash the dialog while checking.
  const { loading: isSessionLoading, session } = useRedirectToLoginIfUnauthenticated();
  const hasSession = Boolean(session);

  const utils = trpc.useUtils();
  const inviteMutation = trpc.viewer.teams.inviteMembershipByLink.useMutation({
    onSuccess: async ({ team }) => {
      await utils.viewer.teams.list.invalidate();
      showToast(t("team_invitation_success", { teamName: team.name ?? "" }), "success");
      router.push("/settings/teams");
    },
  });

  if (isSessionLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Spinner className="text-subtle" />
      </main>
    );
  }

  // Unauthenticated: the hook is redirecting to /auth/login with callbackUrl.
  if (!hasSession) {
    return null;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-2 text-xl font-semibold">{t("team_invitation_title")}</h1>
          <p className="text-subtle">{t("team_invitation_missing_token")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Dialog open={true} onOpenChange={() => undefined}>
        <DialogContent
          type="creation"
          title={t("team_invitation_title")}
          description={t("team_invitation_description")}
          enableOverflow>
          {inviteMutation.isError ? (
            <p className="mb-2 text-sm font-medium text-error">{inviteMutation.error?.message}</p>
          ) : null}
          <DialogFooter showDivider className="relative">
            <Button
              color="minimal"
              onClick={() => {
                router.push("/");
              }}>
              {t("cancel")}
            </Button>
            <Button
              color="primary"
              loading={inviteMutation.isPending}
              onClick={() => {
                inviteMutation.mutate({ token });
              }}>
              {t("team_invitation_accept")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
