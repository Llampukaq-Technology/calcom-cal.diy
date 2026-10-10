"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { HorizontalTabItemProps } from "@calcom/ui/components/navigation";
import { HorizontalTabs } from "@calcom/ui/components/navigation";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

import AvailabilityTab from "./components/AvailabilityTab";
import MembersTab from "./components/MembersTab";
import TeamSettingsTab from "./components/TeamSettingsTab";

type TeamTab = "members" | "general" | "availability";

const TeamView = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TeamTab>("members");

  const {
    data: team,
    isPending,
    error,
  } = trpc.viewer.teams.get.useQuery({ teamId }, { enabled: !!teamId });

  const { data: teams } = trpc.viewer.teams.list.useQuery();
  const myRole = teams?.find((team) => team.id === teamId)?.role;
  const isManager = myRole === MembershipRole.OWNER || myRole === MembershipRole.ADMIN;
  const isOwner = myRole === MembershipRole.OWNER;

  useEffect(() => {
    if (error) {
      router.replace("/settings/teams");
    }
  }, [error, router]);

  const tabs: HorizontalTabItemProps[] = [
    {
      name: "members",
      href: "#members",
      isActive: activeTab === "members",
      onClick: () => setActiveTab("members"),
    },
    {
      name: "general",
      href: "#general",
      isActive: activeTab === "general",
      onClick: () => setActiveTab("general"),
    },
    {
      name: "availability",
      href: "#availability",
      isActive: activeTab === "availability",
      onClick: () => setActiveTab("availability"),
    },
  ];

  if (isPending || !team) {
    return (
      <SkeletonContainer>
        <div className="flex flex-col gap-6">
          <SkeletonText className="h-9 w-64" />
          <SkeletonText className="h-40 w-full" />
        </div>
      </SkeletonContainer>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <HorizontalTabs tabs={tabs} />
      {activeTab === "members" && <MembersTab teamId={teamId} isManager={isManager} />}
      {activeTab === "general" && <TeamSettingsTab team={team} isManager={isManager} isOwner={isOwner} />}
      {activeTab === "availability" && <AvailabilityTab teamId={teamId} />}
    </div>
  );
};

export default TeamView;
