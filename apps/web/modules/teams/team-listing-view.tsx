"use client";

import { sdkActionManager, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { Avatar, UserAvatar, UserAvatarGroup } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/web/modules/event-types/components";
import EmptyPage from "@calcom/web/modules/event-types/components/EmptyPage";
import type { getServerSideProps } from "@server/lib/b/[slug]/getServerSideProps";
import classNames from "classnames";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { Toaster } from "sonner";

import { useToggleQuery } from "@lib/hooks/useToggleQuery";

export type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

type Member = PageProps["team"]["members"][number];

function TeamMember({ member, teamName }: { member: Member; teamName: string }) {
  const routerQuery = useRouterQuery();
  const { t } = useLocale();
  const isBioEmpty = !member.bio || !member.bio.replace("<p><br></p>", "").length;

  // We don't want to forward route parameters to the member's page
  const { slug: _slug, orgSlug: _orgSlug, user: _user, ...queryParamsToForward } = routerQuery;

  return (
    <Link
      key={member.id}
      href={{ pathname: `${WEBAPP_URL}/${member.username}`, query: queryParamsToForward }}>
      <div className="bg-default hover:bg-cal-muted border-subtle group flex min-h-full flex-col gap-y-2 rounded-md border p-4 transition hover:cursor-pointer sm:w-80">
        <UserAvatar noOrganizationIndicator size="md" user={member} />
        <section className="mt-2 line-clamp-4 w-full flex flex-col gap-y-1">
          <p className="text-default font-medium">{member.name}</p>
          <div className="text-subtle line-clamp-3 text-ellipsis text-sm font-normal">
            {!isBioEmpty ? (
              <div
                className="text-subtle wrap-break-word text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via markdownToSafeHTML
                dangerouslySetInnerHTML={{ __html: markdownToSafeHTML(member.bio) }}
              />
            ) : (
              t("user_from_team", { user: member.name, team: teamName })
            )}
          </div>
        </section>
      </div>
    </Link>
  );
}

export function TeamListingPage(props: PageProps) {
  const { team } = props;
  useTheme(team.theme);
  const routerQuery = useRouterQuery();
  const showMembers = useToggleQuery("members");
  const { t } = useLocale();
  const isEmbed = useIsEmbed();

  const teamName = team.name || t("nameless_team");
  const isBioEmpty = !team.bio || !team.bio.replace("<p><br></p>", "").length;

  // slug is a route parameter, we don't want to forward it to the next route
  const { slug: _slug, orgSlug: _orgSlug, user: _user, ...queryParamsToForward } = routerQuery;

  const profileImageSrc = getOrgOrTeamAvatar(team);

  return (
    <>
      <main className="dark:bg-default bg-subtle mx-auto max-w-3xl rounded-md px-4 pb-12 pt-12">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="relative">
            <Avatar alt={teamName} imageSrc={profileImageSrc} size="lg" />
          </div>
          <p className="font-cal text-emphasis mb-2 text-2xl tracking-wider" data-testid="team-name">
            {teamName}
          </p>
          {!isBioEmpty && (
            <>
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via safeBio */}
              <div
                className="text-subtle wrap-break-word text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                dangerouslySetInnerHTML={{ __html: team.safeBio }}
              />
            </>
          )}
        </div>

        {(showMembers.isOn || !team.eventTypes.length) &&
          (team.isPrivate ? (
            <div className="w-full text-center">
              <h2 data-testid="you-cannot-see-team-members" className="text-emphasis font-semibold">
                {t("you_cannot_see_team_members")}
              </h2>
            </div>
          ) : team.members.length ? (
            <section
              data-testid="team-members-container"
              className="flex flex-col flex-wrap justify-center gap-5 sm:flex-row">
              {team.members.map((member) =>
                member.username !== null ? (
                  <TeamMember key={member.id} member={member} teamName={team.name} />
                ) : null
              )}
            </section>
          ) : null)}
        {!showMembers.isOn && team.eventTypes.length > 0 && (
          <div className="mx-auto max-w-3xl">
            <ul className="border-subtle rounded-md border" data-testid="event-types">
              {team.eventTypes.map((type) => (
                <li
                  key={type.id}
                  className={classNames(
                    "bg-default hover:bg-cal-muted border-subtle group relative border-b transition first:rounded-t-md last:rounded-b-md last:border-b-0",
                    !isEmbed && "bg-default"
                  )}>
                  <div className="px-6 py-4">
                    <Link
                      prefetch={false}
                      href={{
                        pathname: `/b/${team.slug}/${type.slug}`,
                        query: queryParamsToForward,
                      }}
                      onClick={async () => {
                        sdkActionManager?.fire("eventTypeSelected", {
                          eventType: type,
                        });
                      }}
                      data-testid="event-type-link"
                      className="flex justify-between">
                      <div className="shrink">
                        <div className="flex flex-wrap items-center space-x-2 rtl:space-x-reverse">
                          <h2 className="text-default text-sm font-semibold">{type.title}</h2>
                        </div>
                        <EventTypeDescription className="text-sm" eventType={type} />
                      </div>
                      <div className="mt-1 self-center">
                        <UserAvatarGroup truncateAfter={4} className="flex shrink-0" size="sm" users={type.users} />
                      </div>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            {!team.isPrivate && !team.hideBookATeamMember && (
              <div>
                <div className="relative mt-12">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="border-subtle w-full border-t" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-subtle text-subtle px-2 text-sm">{t("or")}</span>
                  </div>
                </div>

                <aside className="dark:text-inverted mt-8 flex justify-center text-center">
                  <Button
                    color="minimal"
                    EndIcon="arrow-right"
                    data-testid="book-a-team-member-btn"
                    className="dark:hover:bg-darkgray-200"
                    href={{
                      pathname: `/b/${team.slug}`,
                      query: {
                        ...queryParamsToForward,
                        members: "1",
                      },
                    }}
                    shallow={true}>
                    {t("book_a_team_member")}
                  </Button>
                </aside>
              </div>
            )}
          </div>
        )}

        {!showMembers.isOn && team.eventTypes.length === 0 && team.members.length === 0 && (
          <EmptyPage name={teamName} />
        )}
      </main>
      <Toaster position="bottom-right" />
    </>
  );
}

export default TeamListingPage;
