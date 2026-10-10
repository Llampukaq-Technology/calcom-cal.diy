"use client";

import { useMemo, useState } from "react";

import dayjs from "@calcom/dayjs";
import type { Dayjs } from "@calcom/dayjs";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import type { RouterOutputs } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { Table } from "@calcom/ui/components/table";

const { Cell, ColumnTitle, Header, Row } = Table;

type RawTeamAvailabilityRow = RouterOutputs["viewer"]["availability"]["listTeam"]["rows"][number];

type SerializedDateRange = { start: unknown; end: unknown };

/**
 * dateRanges are dayjs instances built server-side; after the superjson round-trip the
 * dayjs wrapper properties can't be trusted, only the inner `$d` native Date is reliable.
 */
function toNativeDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const maybeDayjs = value as { $d?: unknown };
  if (maybeDayjs.$d instanceof Date) return maybeDayjs.$d;
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Buckets the row's dateRanges into the 7 days of the given week (index 0 = first day of
 * week), formatting each span in the member's timezone. Days without ranges stay empty.
 */
function buildWeeklyAvailability(
  row: RawTeamAvailabilityRow,
  weekStart: Dayjs,
  timeFormat: string
): string[][] {
  const days: string[][] = Array.from({ length: 7 }, () => []);
  for (const range of (row.dateRanges ?? []) as SerializedDateRange[]) {
    const start = toNativeDate(range.start);
    const end = toNativeDate(range.end);
    if (!start || !end) continue;
    const dayIndex = dayjs(start).diff(weekStart, "day");
    if (dayIndex < 0 || dayIndex > 6) continue;
    const span = `${dayjs(start).tz(row.timeZone).format(timeFormat)} – ${dayjs(end)
      .tz(row.timeZone)
      .format(timeFormat)}`;
    if (!days[dayIndex].includes(span)) days[dayIndex].push(span);
  }
  return days;
}

const AvailabilityTab = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const { data: me } = useMeQuery();
  const [weekStart] = useState(() => dayjs().startOf("week"));

  const {
    data: teamAvailability,
    isPending,
  } = trpc.viewer.availability.listTeam.useQuery(
    {
      teamId,
      limit: 100,
      startDate: weekStart.toISOString(),
      endDate: weekStart.add(6, "day").endOf("day").toISOString(),
      loggedInUsersTz: CURRENT_TIMEZONE,
    },
    { enabled: !!teamId }
  );

  const timeFormat = me?.timeFormat === 12 ? "h:mma" : "HH:mm";

  const dayHeaders = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day").format("ddd")),
    [weekStart]
  );

  if (isPending) {
    return (
      <SkeletonContainer>
        <div className="flex flex-col gap-4">
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-40 w-full" />
        </div>
      </SkeletonContainer>
    );
  }

  const rows = teamAvailability?.rows ?? [];

  return (
    <div className="flex flex-col gap-4" data-testid="team-availability-tab">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <p className="text-default text-sm font-semibold">{t("team_availability")}</p>
          <p className="text-subtle text-sm">{t("teams_availability_description")}</p>
        </div>
        <Button type="button" color="secondary" href="/availability" StartIcon="pencil">
          {t("edit_availability")}
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="border-subtle rounded-xl border p-6 text-center">
          <p className="text-default text-sm">{t("teams_no_members")}</p>
        </div>
      ) : (
        <div data-testid="team-availability-list">
          <Table>
            <Header>
              <ColumnTitle widthClassNames="w-auto">{t("member")}</ColumnTitle>
              <ColumnTitle>{t("timezone")}</ColumnTitle>
              <ColumnTitle widthClassNames="w-auto">{t("team_availability_this_week")}</ColumnTitle>
              <ColumnTitle widthClassNames="w-auto">
                <span className="sr-only">{t("edit_availability")}</span>
              </ColumnTitle>
            </Header>
            <tbody className="divide-subtle divide-y rounded-md">
              {rows.map((row) => {
                const weeklyAvailability = buildWeeklyAvailability(row, weekStart, timeFormat);
                const isSelf = me?.id === row.id;
                const hasDefaultSchedule = row.defaultScheduleId !== -1;
                return (
                  <Row key={row.id}>
                    <Cell widthClassNames="w-auto">
                      <div className="flex min-h-10 items-center">
                        <Avatar
                          size="md"
                          alt={row.name || row.email}
                          imageSrc={getUserAvatarUrl({ avatarUrl: "avatarUrl" in row ? (row.avatarUrl ?? null) : null })}
                        />
                        <div className="ml-4 font-medium text-subtle">
                          <span className="text-default">{row.name || "-"}</span>
                          <span className="ml-3">{row.username ? `/${row.username}` : ""}</span>
                          <br />
                          <span className="break-all">{row.email}</span>
                        </div>
                      </div>
                    </Cell>
                    <Cell>
                      <div className="flex flex-col text-sm">
                        <span className="text-default">{row.timeZone}</span>
                        <span className="text-subtle text-xs">
                          {dayjs().tz(row.timeZone).format(timeFormat)}
                        </span>
                      </div>
                    </Cell>
                    <Cell widthClassNames="w-auto">
                      {hasDefaultSchedule ? (
                        <div className="flex flex-col gap-1 text-xs" data-testid="team-availability-schedule">
                          {dayHeaders.map((dayHeader, dayIndex) => (
                            <div key={dayHeader} className="flex gap-2">
                              <span className="text-subtle w-10 shrink-0">{dayHeader}</span>
                              <span className="text-default">
                                {weeklyAvailability[dayIndex].join(", ") || "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="gray">{t("team_availability_no_default_schedule")}</Badge>
                      )}
                    </Cell>
                    <Cell widthClassNames="w-auto">
                      {isSelf && (
                        <Button type="button" color="secondary" size="sm" href="/availability">
                          {t("edit_availability")}
                        </Button>
                      )}
                    </Cell>
                  </Row>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AvailabilityTab;
