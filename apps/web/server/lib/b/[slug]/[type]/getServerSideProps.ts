import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule, getBookingForSeatedEvent } from "@calcom/features/bookings/lib/get-booking";
import { getTeamEventType } from "@calcom/features/eventtypes/lib/getTeamEventType";
import type { PublicEventType } from "@calcom/features/eventtypes/lib/getPublicEvent";
import { EventRepository } from "@calcom/features/eventtypes/repositories/EventRepository";
import { shouldHideBrandingForTeamEvent } from "@calcom/features/profile/lib/hideBranding";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { BookingStatus, RedirectType, SchedulingType } from "@calcom/prisma/enums";
import { handleOrgRedirect } from "@lib/handleOrgRedirect";
import type { GetServerSidePropsContext } from "next";
import type { Session } from "next-auth";
import { z } from "zod";

type Props = {
  eventData: NonNullable<PublicEventType>;
  booking?: GetBookingType;
  rescheduleUid: string | null;
  bookingUid: string | null;
  user: string;
  slug: string;
  isBrandingHidden: boolean;
  isSEOIndexable: boolean | null;
  themeBasis: null | string;
  orgBannerUrl: null;
};

async function processReschedule({
  props,
  rescheduleUid,
  session,
  allowRescheduleForCancelledBooking,
}: {
  props: Props;
  session: Session | null;
  rescheduleUid: string | string[] | undefined;
  allowRescheduleForCancelledBooking?: boolean;
}) {
  if (!rescheduleUid) return;

  const booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);

  if (booking?.eventType?.disableRescheduling) {
    return {
      redirect: {
        destination: `/booking/${rescheduleUid}`,
        permanent: false,
      },
    };
  }

  // if no booking found, no eventTypeId (dynamic) or it matches this eventData - return void (success).
  if (
    booking === null ||
    !booking.eventTypeId ||
    (booking?.eventTypeId === props.eventData?.id &&
      (booking.status !== BookingStatus.CANCELLED ||
        allowRescheduleForCancelledBooking ||
        props.eventData?.allowReschedulingCancelledBookings))
  ) {
    props.booking = booking;
    props.rescheduleUid = Array.isArray(rescheduleUid) ? rescheduleUid[0] : rescheduleUid;
    return;
  }
  // handle redirect response
  const redirectEventTypeTarget = await prisma.eventType.findUnique({
    where: {
      id: booking.eventTypeId,
    },
    select: {
      slug: true,
    },
  });
  if (!redirectEventTypeTarget) {
    return {
      notFound: true,
    } as const;
  }
  return {
    redirect: {
      permanent: false,
      destination: redirectEventTypeTarget.slug,
    },
  };
}

async function processSeatedEvent({
  props,
  bookingUid,
  allowRescheduleForCancelledBooking,
}: {
  props: Props;
  bookingUid: string | string[] | undefined;
  allowRescheduleForCancelledBooking?: boolean;
}) {
  if (!bookingUid) return;
  const booking = await getBookingForSeatedEvent(`${bookingUid}`);
  if (booking?.status === BookingStatus.CANCELLED && !allowRescheduleForCancelledBooking) {
    return {
      redirect: {
        permanent: false,
        destination: `${props.slug}`,
      },
    };
  } else {
    props.booking = booking;
    props.bookingUid = Array.isArray(bookingUid) ? bookingUid[0] : bookingUid;
  }
}

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

// Team Booker page. `getTeamEventType` resolves the team event type by team slug + meeting slug
// and validates it is publicly bookable; the Booker itself consumes the enriched
// `getPublicEvent` shape it already knows how to render.
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession({ req: context.req });
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(context.params);
  const { rescheduleUid, bookingUid } = context.query;
  const allowRescheduleForCancelledBooking = context.query.allowRescheduleForCancelledBooking === "true";
  // Cal.diy does not ship organization domains: the team slug is never nested under an org slug.
  const org = null;

  const redirect = await handleOrgRedirect({
    slugs: [teamSlug],
    redirectType: RedirectType.Team,
    eventTypeSlug: meetingSlug,
    context,
    currentOrgDomain: org,
  });

  if (redirect) {
    return redirect;
  }

  const [teamEventType, team] = await Promise.all([
    getTeamEventType(teamSlug, meetingSlug, org),
    prisma.team.findFirst({
      where: {
        slug: teamSlug,
      },
      select: {
        id: true,
        hideBranding: true,
        parent: {
          select: {
            hideBranding: true,
          },
        },
        organizationSettings: {
          select: {
            allowSEOIndexing: true,
          },
        },
      },
    }),
  ]);

  if (!team || !teamEventType) {
    return {
      notFound: true,
    } as const;
  }

  if (teamEventType.schedulingType === SchedulingType.MANAGED) {
    return {
      notFound: true,
    } as const;
  }

  const eventData = await EventRepository.getPublicEvent(
    {
      username: teamSlug,
      eventSlug: meetingSlug,
      isTeamEvent: true,
      org,
      fromRedirectOfNonOrgLink: context.query.orgRedirection === "true",
    },
    session?.user?.id
  );

  if (!eventData) {
    return {
      notFound: true,
    } as const;
  }

  const props: Props = {
    eventData,
    user: teamSlug,
    slug: meetingSlug,
    isBrandingHidden: shouldHideBrandingForTeamEvent({
      eventTypeId: eventData.id,
      team,
    }),
    isSEOIndexable: team.organizationSettings?.allowSEOIndexing ?? true,
    themeBasis: null,
    bookingUid: bookingUid ? `${bookingUid}` : null,
    rescheduleUid: null,
    orgBannerUrl: null,
  };

  if (rescheduleUid) {
    const processRescheduleResult = await processReschedule({
      props,
      rescheduleUid,
      session,
      allowRescheduleForCancelledBooking,
    });
    if (processRescheduleResult) {
      return processRescheduleResult;
    }
  } else if (bookingUid) {
    const processSeatResult = await processSeatedEvent({
      props,
      bookingUid,
      allowRescheduleForCancelledBooking,
    });
    if (processSeatResult) {
      return processSeatResult;
    }
  }

  return {
    props,
  };
};
