"use client";

import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dialog,
  DialogContent,
  ConfirmationDialogContent,
} from "@calcom/ui/components/dialog";
import { Select } from "@calcom/ui/components/form";
import { Table, DropdownActions } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";

const { Cell, ColumnTitle, Header, Row } = Table;

type TeamMember = RouterOutputs["viewer"]["teams"]["getMembers"][number];

const roleOptions: { value: MembershipRole; labelKey: string }[] = [
  { value: MembershipRole.OWNER, labelKey: "owner" },
  { value: MembershipRole.ADMIN, labelKey: "admin" },
  { value: MembershipRole.MEMBER, labelKey: "member" },
];

const InviteLinkCard = ({ teamId, isManager }: { teamId: number; isManager: boolean }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { data: inviteLink } = trpc.viewer.teams.inviteLink.get.useQuery(
    { teamId },
    { enabled: isManager }
  );

  const [expiresInDays, setExpiresInDays] = useState(7);

  const createLinkMutation = trpc.viewer.teams.inviteLink.create.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.inviteLink.get.invalidate({ teamId });
      showToast(t("teams_invite_link_created"), "success");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const deleteLinkMutation = trpc.viewer.teams.inviteLink.delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.inviteLink.get.invalidate({ teamId });
      showToast(t("teams_invite_link_deleted"), "success");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  if (!isManager) {
    return null;
  }

  const copyInviteLink = (token: string) => {
    navigator.clipboard
      .writeText(`${WEBAPP_URL}/teams/invite/${token}`)
      .then(() => showToast(t("copied"), "success"))
      .catch(() => showToast(t("something_went_wrong"), "error"));
  };

  return (
    <div className="border-subtle rounded-xl border p-5" data-testid="invite-link-card">
      <p className="text-default text-sm font-medium">{t("teams_invite_link")}</p>
      <p className="text-subtle mt-1 text-sm">{t("teams_invite_link_description")}</p>

      {inviteLink ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <code className="bg-cal-muted text-default min-w-0 flex-1 truncate rounded-md px-3 py-2 text-sm">
              {WEBAPP_URL}/teams/invite/{inviteLink.token}
            </code>
            <Button
              type="button"
              color="secondary"
              size="sm"
              StartIcon="copy"
              onClick={() => copyInviteLink(inviteLink.token)}>
              {t("copy_link")}
            </Button>
          </div>
          <p className="text-subtle text-xs">
            {t("expires")}: {inviteLink.expiresInDays}d
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              color="secondary"
              data-testid="regenerate-invite-link"
              StartIcon="refresh-ccw"
              loading={createLinkMutation.isPending}
              onClick={() => createLinkMutation.mutate({ teamId, expiresInDays })}>
              {t("teams_invite_link_regenerate")}
            </Button>
            <Button
              type="button"
              color="destructive"
              data-testid="delete-invite-link"
              StartIcon="trash"
              loading={deleteLinkMutation.isPending}
              onClick={() => deleteLinkMutation.mutate({ teamId })}>
              {t("teams_invite_link_delete")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-default text-sm">{t("teams_invite_expires_in_days")}</span>
            <Select<{ value: number; label: string }>
              className="w-28"
              isSearchable={false}
              value={{ value: expiresInDays, label: String(expiresInDays) }}
              onChange={(option) => option && setExpiresInDays(option.value)}
              options={[1, 7, 30, 90].map((days) => ({
                value: days,
                label: String(days),
              }))}
            />
          </div>
          <Button
            type="button"
            color="primary"
            data-testid="create-invite-link"
            StartIcon="plus"
            loading={createLinkMutation.isPending}
            onClick={() => createLinkMutation.mutate({ teamId, expiresInDays })}>
            {t("teams_invite_link_create")}
          </Button>
        </div>
      )}
    </div>
  );
};

const MembersTab = ({
  teamId,
  isManager,
}: {
  teamId: number;
  isManager: boolean;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const { data: members, isPending } = trpc.viewer.teams.getMembers.useQuery(
    { teamId },
    { enabled: !!teamId }
  );

  const removeMemberMutation = trpc.viewer.teams.removeMembership.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.getMembers.invalidate({ teamId });
      setMemberToRemove(null);
      showToast(t("member_removed"), "success");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const setRoleMutation = trpc.viewer.teams.setMembershipRole.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.getMembers.invalidate({ teamId });
      showToast(t("teams_role_changed"), "success");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  if (isPending) {
    return <div className="bg-cal-muted h-40 animate-pulse rounded-md" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {(!members || members.length === 0) && (
        <div className="border-subtle rounded-xl border p-6 text-center">
          <p className="text-default text-sm">{t("teams_no_members")}</p>
        </div>
      )}

      {members && members.length > 0 && (
        <div data-testid="member-list">
          <Table>
          <Header>
            <ColumnTitle widthClassNames="w-auto">{t("member")}</ColumnTitle>
            <ColumnTitle>{t("role")}</ColumnTitle>
            <ColumnTitle>{t("status")}</ColumnTitle>
            <ColumnTitle widthClassNames="w-auto">
              <span className="sr-only">{t("edit")}</span>
            </ColumnTitle>
          </Header>
          <tbody className="divide-subtle divide-y rounded-md">
            {members.map((member) => (
              <Row key={member.id}>
                <Cell widthClassNames="w-auto">
                  <div className="flex min-h-10 items-center">
                    <Avatar
                      size="md"
                      alt={member.name || member.email}
                      imageSrc={getUserAvatarUrl(member)}
                    />
                    <div className="ml-4 font-medium text-subtle">
                      <span className="text-default">{member.name || "-"}</span>
                      <span className="ml-3">{member.username ? `/${member.username}` : ""}</span>
                      <br />
                      <span className="break-all">{member.email}</span>
                    </div>
                  </div>
                </Cell>
                <Cell>
                  <Select<{ value: MembershipRole; label: string }>
                    className="w-32"
                    isSearchable={false}
                    isDisabled={!isManager || setRoleMutation.isPending}
                    value={{
                      value: member.role,
                      label: t(roleOptions.find((o) => o.value === member.role)?.labelKey ?? "member"),
                    }}
                    onChange={(option) => {
                      if (!option) return;
                      setRoleMutation.mutate({ teamId, memberId: member.id, role: option.value });
                    }}
                    options={roleOptions.map((option) => ({
                      value: option.value,
                      label: t(option.labelKey),
                    }))}
                  />
                </Cell>
                <Cell>
                  {member.accepted ? (
                    <Badge variant="green">{t("accepted")}</Badge>
                  ) : (
                    <Badge variant="orange">{t("pending")}</Badge>
                  )}
                </Cell>
                <Cell widthClassNames="w-auto">
                  {isManager && (
                    <DropdownActions
                      actions={[
                        {
                          id: "remove-member",
                          label: t("remove_member"),
                          icon: "trash",
                          onClick: () => setMemberToRemove(member),
                        },
                      ]}
                    />
                  )}
                </Cell>
              </Row>
            ))}
          </tbody>
          </Table>
        </div>
      )}

      <InviteLinkCard teamId={teamId} isManager={isManager} />

      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent type="creation">
          <ConfirmationDialogContent
            variety="danger"
            title={t("remove_member")}
            confirmBtnText={t("remove_member")}
            onConfirm={(e) => {
              e.preventDefault();
              if (!memberToRemove) return;
              removeMemberMutation.mutate({ teamId, memberId: memberToRemove.id });
            }}>
            {t("teams_remove_member_confirmation", { memberName: memberToRemove?.name || "" })}
          </ConfirmationDialogContent>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersTab;
