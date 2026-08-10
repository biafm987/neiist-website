import Calendar from "@/components/activities/Calendar";
import { syncNotionEventsToDb } from "@/utils/eventsUtils";
import { getLocale, getDictionary } from "@/lib/i18n";
import { UserRole } from "@/types/user";
import styles from "@/styles/pages/Activities.module.css";
import ColorfulText from "@/components/ColorfulText";
import { getActivitiesEventsFromDb } from "@/utils/db/eventQueries";
import { serverCheckRoles } from "@/lib/auth";

async function getEventsAndSubscriptions() {
  let istid: string | null = null;
  let isAdmin = false;

  const perm = await serverCheckRoles([]); // authenticate
  if (perm.isAuthorized && perm.user) {
    istid = perm.user.istid;
    isAdmin = perm.roles?.includes(UserRole._ADMIN) ?? false;
  }

  let events = await getActivitiesEventsFromDb().catch(() => []);

  // If no events in DB, sync from Notion
  if (events.length === 0) {
    await syncNotionEventsToDb();
    events = await getActivitiesEventsFromDb();
  }

  const signedUpEventIds = istid
    ? events.filter((event) => event.subscribers?.includes(istid)).map((event) => event.id)
    : [];

  return { events, signedUpEventIds, istid, isAdmin };
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ eventId?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const { events, signedUpEventIds } = await getEventsAndSubscriptions();
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const urlSelectedEventID = params.eventId || undefined;

  return (
    <div className={styles.container}>
      <ColorfulText
        as="h1"
        className={styles.title}
        text={dict.activities?.title ?? ""}
      />
      <Calendar
        events={events}
        signedUpEventIds={signedUpEventIds}
        initialSelectedEventId={urlSelectedEventID}
        dict={dict.activities}
        locale={locale}
      />
    </div>
  );
}
