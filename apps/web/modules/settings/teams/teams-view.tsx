"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Label, TextField } from "@calcom/ui/components/form";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

type TeamWithRole = RouterOutputs["viewer"]["teams"]["list"][number];

const CreateTeamDialog = ({ isOpen, onExit }: { isOpen: boolean; onExit: () => void }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");

  const createMutation = trpc.viewer.teams.create.useMutation({
    onSuccess: async (team) => {
      await utils.viewer.teams.list.invalidate();
      showToast(t("teams_created_successfully"), "success");
      onExit();
      router.push(`/settings/teams/${team.id}`);
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setSlugManuallyEdited(true);
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedName) {
      showToast(t("team_name_required"), "error");
      return;
    }
    if (!trimmedSlug) {
      showToast(t("team_url_required"), "error");
      return;
    }
    createMutation.mutate({
      name: trimmedName,
      slug: trimmedSlug,
      logoUrl: logoUrl.trim() || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onExit()}>
      <DialogContent type="creation">
        <DialogHeader title={t("teams_new_team")} subtitle={t("create_new_team_description")} />
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="team-name">{t("team_name")}</Label>
            <TextField
              id="team-name"
              name="team-name"
              data-testid="team-name-input"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div>
            <Label htmlFor="team-slug">{t("team_url")}</Label>
            <TextField
              id="team-slug"
              name="team-slug"
              data-testid="team-slug-input"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="acme"
              addOnLeading="/teams/"
            />
          </div>
          <div>
            <Label htmlFor="team-logo-url">{t("teams_logo_url")}</Label>
            <TextField
              id="team-logo-url"
              name="team-logo-url"
              data-testid="team-logo-url-input"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" color="minimal" onClick={onExit} disabled={createMutation.isPending}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            color="primary"
            data-testid="create-team-submit"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !name.trim() || !slug.trim()}>
            {t("create_team")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TeamsView = () => {
  const { t } = useLocale();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: teams, isPending } = trpc.viewer.teams.list.useQuery();

  if (isPending) {
    return (
      <SkeletonContainer>
        <div className="flex flex-col gap-4">
          <SkeletonButton className="h-9 w-28 self-end rounded-md" />
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <SkeletonText className="h-12 w-full" key={i} />
            ))}
          </div>
        </div>
      </SkeletonContainer>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="teams-list">
      <div className="flex justify-end">
        <Button
          type="button"
          color="primary"
          data-testid="new-team-button"
          StartIcon="plus"
          onClick={() => setShowCreateDialog(true)}>
          {t("teams_new_team")}
        </Button>
      </div>

      {(!teams || teams.length === 0) && (
        <div className="border-subtle rounded-xl border p-6 text-center">
          <p className="text-default text-sm font-medium">{t("teams_new_team")}</p>
          <p className="text-subtle mt-2 text-sm">{t("create_new_team_description")}</p>
        </div>
      )}

      {teams && teams.length > 0 && (
        <div className="border-subtle divide-subtle divide-y overflow-hidden rounded-xl border">
          {teams.map((team: TeamWithRole) => (
            <div key={team.id} className="flex items-center justify-between p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  size="md"
                  alt={team.name}
                  imageSrc={getPlaceholderAvatar(team.logoUrl, team.name)}
                />
                <div className="min-w-0">
                  <p className="text-default truncate text-sm font-medium">{team.name}</p>
                  <p className="text-subtle truncate text-xs">/{team.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="gray">{team.role}</Badge>
                <Button
                  type="button"
                  color="secondary"
                  data-testid={`team-row-${team.id}`}
                  href={`/settings/teams/${team.id}`}>
                  {t("edit")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTeamDialog isOpen={showCreateDialog} onExit={() => setShowCreateDialog(false)} />
    </div>
  );
};

export default TeamsView;
