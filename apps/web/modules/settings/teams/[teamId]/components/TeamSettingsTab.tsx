"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { ColorPicker, Form, Label, Select, Switch, TextAreaField, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { TimezoneSelect } from "~/timezone/components/TimezoneSelect";

type Team = NonNullable<RouterOutputs["viewer"]["teams"]["get"]>;

type TeamSettingsFormValues = {
  name: string;
  slug: string;
  logoUrl: string;
  bio: string;
  timeZone: string;
  weekStart: { value: string; label: string };
  timeFormat: { value: number; label: string };
  theme: string;
  brandColor: string;
  darkBrandColor: string;
  hideBranding: boolean;
  hideTeamProfileLink: boolean;
  hideBookATeamMember: boolean;
  isPrivate: boolean;
};

const weekStartOptions = (locale: string) =>
  [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
    const value = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayIdx];
    return { value, label: nameOfDay(locale, dayIdx) };
  });

const ToggleRow = ({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div>
      <p className="text-default text-sm font-medium">{title}</p>
      {description && <p className="text-subtle text-sm">{description}</p>}
    </div>
    <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} labelOnLeading />
  </div>
);

const TeamSettingsTab = ({ team, isManager, isOwner }: { team: Team; isManager: boolean; isOwner: boolean }) => {
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const timeFormatOptions = [
    { value: 12, label: t("12_hour") },
    { value: 24, label: t("24_hour") },
  ];

  const form = useForm<TeamSettingsFormValues>({
    defaultValues: {
      name: team.name,
      slug: team.slug || "",
      logoUrl: team.logoUrl || "",
      bio: team.bio || "",
      timeZone: team.timeZone || "",
      weekStart: {
        value: team.weekStart || "Sunday",
        label: weekStartOptions(i18n.language).find((option) => option.value === (team.weekStart || "Sunday"))?.label || "",
      },
      timeFormat: {
        value: team.timeFormat || 12,
        label: timeFormatOptions.find((option) => option.value === team.timeFormat)?.label || t("12_hour"),
      },
      theme: team.theme || "",
      brandColor: team.brandColor || "",
      darkBrandColor: team.darkBrandColor || "",
      hideBranding: !!team.hideBranding,
      hideTeamProfileLink: !!team.hideTeamProfileLink,
      hideBookATeamMember: !!team.hideBookATeamMember,
      isPrivate: !!team.isPrivate,
    },
  });

  const {
    formState: { isDirty, isSubmitting },
    reset,
  } = form;

  const updateMutation = trpc.viewer.teams.update.useMutation({
    onSuccess: async (updatedTeam) => {
      await Promise.all([
        utils.viewer.teams.get.invalidate({ teamId: team.id }),
        utils.viewer.teams.list.invalidate(),
      ]);
      showToast(t("team_updated_successfully"), "success");
      reset({
        name: updatedTeam.name,
        slug: updatedTeam.slug || "",
        logoUrl: updatedTeam.logoUrl || "",
        bio: updatedTeam.bio || "",
        timeZone: updatedTeam.timeZone || "",
        weekStart: { value: updatedTeam.weekStart || "Sunday", label: "" },
        timeFormat: { value: updatedTeam.timeFormat || 12, label: "" },
        theme: updatedTeam.theme || "",
        brandColor: updatedTeam.brandColor || "",
        darkBrandColor: updatedTeam.darkBrandColor || "",
        hideBranding: !!updatedTeam.hideBranding,
        hideTeamProfileLink: !!updatedTeam.hideTeamProfileLink,
        hideBookATeamMember: !!updatedTeam.hideBookATeamMember,
        isPrivate: !!updatedTeam.isPrivate,
      });
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const deleteMutation = trpc.viewer.teams.delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.list.invalidate();
      showToast(t("teams_deleted_successfully"), "success");
      router.push("/settings/teams");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  if (!isManager) {
    return (
      <div className="border-subtle rounded-md border p-5">
        <span className="text-default text-sm">{t("only_owner_change")}</span>
      </div>
    );
  }

  const handleSubmit = (values: TeamSettingsFormValues) => {
    updateMutation.mutate({
      teamId: team.id,
      name: values.name,
      slug: values.slug,
      logoUrl: values.logoUrl || null,
      bio: values.bio,
      timeZone: values.timeZone,
      weekStart: values.weekStart.value,
      timeFormat: values.timeFormat.value,
      theme: values.theme || null,
      brandColor: values.brandColor,
      darkBrandColor: values.darkBrandColor,
      hideBranding: values.hideBranding,
      hideTeamProfileLink: values.hideTeamProfileLink,
      hideBookATeamMember: values.hideBookATeamMember,
      isPrivate: values.isPrivate,
    });
  };

  return (
    <>
      <Form form={form} handleSubmit={handleSubmit}>
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <Controller
              name="name"
              render={({ field }) => (
                <TextField
                  name="team-name"
                  label={t("team_name")}
                  data-testid="team-settings-name"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />
            <Controller
              name="slug"
              render={({ field }) => (
                <TextField
                  name="team-slug"
                  label={t("team_url")}
                  data-testid="team-settings-slug"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  addOnLeading="/teams/"
                />
              )}
            />
            <Controller
              name="logoUrl"
              render={({ field }) => (
                <TextField
                  name="team-logo-url"
                  label={t("teams_logo_url")}
                  data-testid="team-settings-logo-url"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />
            <Controller
              name="bio"
              render={({ field }) => (
                <TextAreaField
                  name="team-bio"
                  label={t("bio")}
                  data-testid="team-settings-bio"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  rows={3}
                />
              )}
            />
          </div>

          <div className="border-subtle flex flex-col gap-4 rounded-xl border p-5">
            <p className="text-default text-sm font-medium">{t("general")}</p>
            <Controller
              name="timeZone"
              render={({ field }) => (
                <div>
                  <Label>{t("timezone")}</Label>
                  <TimezoneSelect
                    value={field.value || "Europe/London"}
                    onChange={(option) => field.onChange(String(option.value))}
                    isDisabled={!isManager}
                  />
                </div>
              )}
            />
            <Controller
              name="weekStart"
              render={({ field }) => (
                <div>
                  <Label>{t("teams_week_start")}</Label>
                  <Select
                    isSearchable={false}
                    value={field.value}
                    onChange={(option) => option && field.onChange(option)}
                    options={weekStartOptions(i18n.language)}
                  />
                </div>
              )}
            />
            <Controller
              name="timeFormat"
              render={({ field }) => (
                <div>
                  <Label>{t("time_format")}</Label>
                  <Select
                    isSearchable={false}
                    value={field.value}
                    onChange={(option) => option && field.onChange(option)}
                    options={timeFormatOptions}
                  />
                </div>
              )}
            />
          </div>

          <div className="border-subtle flex flex-col rounded-xl border p-5">
            <p className="text-default mb-2 text-sm font-medium">{t("appearance")}</p>
            <Controller
              name="brandColor"
              render={({ field }) => (
                <div>
                  <Label>{t("brand_color")}</Label>
                  <ColorPicker defaultValue={field.value ?? "#292929"} resetDefaultValue="#292929" onChange={field.onChange} />
                </div>
              )}
            />
            <Controller
              name="darkBrandColor"
              render={({ field }) => (
                <div>
                  <Label>{t("dark_brand_color")}</Label>
                  <ColorPicker defaultValue={field.value ?? "#fafafa"} resetDefaultValue="#fafafa" onChange={field.onChange} />
                </div>
              )}
            />
            <Controller
              name="theme"
              render={({ field }) => (
                <TextField
                  name="team-theme"
                  label={t("theme")}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="light / dark / system"
                />
              )}
            />
          </div>

          <div className="border-subtle divide-subtle divide-y rounded-xl border px-5">
            <Controller
              name="isPrivate"
              render={({ field }) => (
                <ToggleRow
                  title={t("teams_is_private")}
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="hideTeamProfileLink"
              render={({ field }) => (
                <ToggleRow
                  title={t("teams_hide_team_profile_link")}
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="hideBookATeamMember"
              render={({ field }) => (
                <ToggleRow
                  title={t("teams_hide_book_a_team_member")}
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="hideBranding"
              render={({ field }) => (
                <ToggleRow
                  title={t("teams_hide_branding")}
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <SectionBottomActions align="end">
            <Button
              type="submit"
              color="primary"
              data-testid="team-settings-save"
              loading={isSubmitting || updateMutation.isPending}
              disabled={!isDirty}>
              {t("save")}
            </Button>
          </SectionBottomActions>
        </section>
      </Form>

      {isOwner && (
        <div className="border-subtle mt-6 flex flex-col gap-3 rounded-xl border border-red-200 p-5">
          <p className="text-default text-sm font-medium">{t("danger_zone")}</p>
          <p className="text-subtle text-sm">{t("team_deletion_cannot_be_undone")}</p>
          <Button
            type="button"
            color="destructive"
            data-testid="delete-team-button"
            StartIcon="trash"
            onClick={() => setIsDeleteDialogOpen(true)}>
            {t("teams_delete_team")}
          </Button>
        </div>
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent type="creation">
          <ConfirmationDialogContent
            variety="danger"
            title={t("teams_delete_team")}
            confirmBtnText={t("teams_delete_team")}
            onConfirm={(e) => {
              e.preventDefault();
              deleteMutation.mutate({ teamId: team.id });
            }}>
            {t("teams_delete_team_confirmation")}
          </ConfirmationDialogContent>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamSettingsTab;
