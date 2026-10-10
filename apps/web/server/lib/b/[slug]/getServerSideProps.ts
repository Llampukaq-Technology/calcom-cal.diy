import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import slugify from "@calcom/lib/slugify";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import { prisma } from "@calcom/prisma";
import { RedirectType, SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { UserProfile } from "@calcom/types/UserProfile";
import { handleOrgRedirect } from "@lib/handleOrgRedirect";
import type { EmbedProps } from "app/WithEmbedSSR";
import type { EventType } from "@calcom/prisma/client";
import type { GetServerSideProps } from "next";
import type { z } from "zod";

type TeamEventTypeListingItem = {
  descriptionAsSafeHTML: string | null;
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
  users: {
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
    profile: Omit<UserProfile, "upId">;
  }[];
} & Pick<
  EventType,
  | "id"
  | "title"
  | "slug"
  | "length"
  | "hidden"
  | "lockTimeZoneToggleOnBookingPage"
  | "lockedTimeZone"
  | "requiresConfirmation"
  | "canSendCalVideoTranscriptionEmails"
  | "requiresBookerEmailVerification"
  | "price"
  | "currency"
  | "recurringEvent"
  | "seatsPerTimeSlot"
  | "schedulingType"
>;

type TeamPageProps = {
  team: {
    id: number;
    name: string;
    slug: string;
    bio: string | null;
    safeBio: string;
    theme: string | null;
    isPrivate: boolean;
    hideBookATeamMember: boolean;
    logoUrl: string | null;
    brandColor: string | null;
    darkBrandColor: string | null;
    eventTypes: TeamEventTypeListingItem[];
    members: {
      id: number;
      name: string | null;
      username: string | null;
      bio: string | null;
      avatarUrl: string | null;
      profile: Omit<UserProfile, "upId">;
    }[];
  };
  themeBasis: string | null;
  markdownStrippedBio: string;
  isSEOIndexable: boolean;
} & EmbedProps;

export const getServerSideProps: GetServerSideProps<TeamPageProps> = async (context) => {
  // Cal.diy does not ship organization domains: the slug is always a plain team slug.
  const slug = slugify(`${context.params?.slug ?? ""}`);

  const redirect = await handleOrgRedirect({
    slugs: [slug],
    redirectType: RedirectType.Team,
    eventTypeSlug: null,
    context,
    currentOrgDomain: null,
  });

  if (redirect) {
    return redirect;
  }

  const team = await prisma.team.findFirst({
    where: {
      slug,
    },
    orderBy: {
      slug: { sort: "asc", nulls: "last" },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      theme: true,
      isPrivate: true,
      hideBranding: true,
      hideBookATeamMember: true,
      logoUrl: true,
      brandColor: true,
      darkBrandColor: true,
      organizationSettings: {
        select: {
          allowSEOIndexing: true,
        },
      },
      eventTypes: {
        where: {
          hidden: false,
          schedulingType: {
            not: SchedulingType.MANAGED,
          },
        },
        orderBy: [{ position: "desc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          length: true,
          hidden: true,
          schedulingType: true,
          recurringEvent: true,
          slug: true,
          price: true,
          currency: true,
          lockTimeZoneToggleOnBookingPage: true,
          lockedTimeZone: true,
          requiresConfirmation: true,
          requiresBookerEmailVerification: true,
          canSendCalVideoTranscriptionEmails: true,
          seatsPerTimeSlot: true,
          metadata: true,
          users: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
      members: {
        where: {
          accepted: true,
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              bio: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    return {
      notFound: true,
    } as const;
  }

  const safeBio = markdownToSafeHTML(team.bio) || "";
  const markdownStrippedBio = stripMarkdown(team?.bio || "");
  const allowSEOIndexing = team.organizationSettings?.allowSEOIndexing ?? true;

  const eventTypes = team.eventTypes.map((eventType) => {
    const metadataParsed = EventTypeMetaDataSchema.safeParse(eventType.metadata || {});
    return {
      id: eventType.id,
      title: eventType.title,
      slug: eventType.slug,
      length: eventType.length,
      hidden: eventType.hidden,
      schedulingType: eventType.schedulingType,
      recurringEvent: eventType.recurringEvent,
      price: eventType.price,
      currency: eventType.currency,
      lockTimeZoneToggleOnBookingPage: eventType.lockTimeZoneToggleOnBookingPage,
      lockedTimeZone: eventType.lockedTimeZone,
      requiresConfirmation: eventType.requiresConfirmation,
      canSendCalVideoTranscriptionEmails: eventType.canSendCalVideoTranscriptionEmails,
      requiresBookerEmailVerification: eventType.requiresBookerEmailVerification,
      seatsPerTimeSlot: eventType.seatsPerTimeSlot,
      metadata: metadataParsed.success ? metadataParsed.data : EventTypeMetaDataSchema.parse({}),
      descriptionAsSafeHTML: markdownToSafeHTML(eventType.description),
      users: eventType.users.map((user) => ({
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        profile: {
          id: user.id,
          username: user.username,
          organizationId: null,
          organization: null,
        },
      })),
    };
  });

  const members = team.members.map(({ user }) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    profile: {
      id: user.id,
      username: user.username,
      organizationId: null,
      organization: null,
    },
  }));

  return {
    props: {
      team: {
        id: team.id,
        name: team.name,
        // The query matched on the route slug, so team.slug can only be null in the Prisma type.
        slug: team.slug ?? slug,
        bio: team.bio,
        safeBio,
        theme: team.theme,
        isPrivate: team.isPrivate,
        hideBookATeamMember: team.hideBookATeamMember,
        logoUrl: team.logoUrl,
        brandColor: team.brandColor,
        darkBrandColor: team.darkBrandColor,
        eventTypes,
        members,
      },
      themeBasis: team.slug,
      markdownStrippedBio,
      isSEOIndexable: allowSEOIndexing,
    },
  };
};
