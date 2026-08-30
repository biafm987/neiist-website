import {
  getVotingSessions,
  getVotingSessionById,
  getSessionResults,
} from "@/utils/db/votingQueries";
import { getActivitiesEventsFromDb } from "@/utils/db/eventQueries";
import { getAllUsers } from "@/utils/db/userQueries";
import { getLocale, getDictionary } from "@/lib/i18n";
import AdminVotingSync from "@/components/voting/AdminVotingSync";
import VotingManagement from "@/components/voting/admin/VotingManagement";
import VotingSessionDetailOverlay from "@/components/voting/admin/VotingSessionDetailOverlay";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ sessionId?: string }>;
}

export default async function VotingManagePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId = params.sessionId ? parseInt(params.sessionId, 10) : undefined;

  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const [sessions, activities, users] = await Promise.all([
    getVotingSessions(100),
    getActivitiesEventsFromDb(),
    getAllUsers(),
  ]);

  let selectedSession = null;
  let results = null;
  if (sessionId) {
    [selectedSession, results] = await Promise.all([
      getVotingSessionById(sessionId),
      getSessionResults(sessionId),
    ]);
  }

  return (
    <>
      <AdminVotingSync />
      <VotingManagement
        initialSessions={sessions}
        activities={activities}
        users={users}
        locale={locale}
        dict={{
          active_filters: dict.active_filters,
          date_filter: dict.date_filter,
          mobile_filters_drawer: dict.mobile_filters_drawer,
          confirm_dialog: dict.confirm_dialog,
        }}
      />
      {selectedSession ? (
        <VotingSessionDetailOverlay session={selectedSession} results={results || []} />
      ) : null}
    </>
  );
}
