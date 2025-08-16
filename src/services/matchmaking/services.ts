// services/matchmaking.ts
import { supabase } from "../../lib/supabase";

/** What the match list needs to render and score */
export type MatchCandidate = {
  id: string;
  name: string;
  uni: string | null;
  course?: string | null;        // optional: first course (if any)
  interests: string[];           // hobbies for now
  goals: string[];               // academic goals names
  availability: string[];        // from users.study_availability
};

async function getMyUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

/** Pull basic user rows (excluding me) */
async function fetchBaseUsers(limit = 50) {
  const me = await getMyUserId();
  if (!me) return [];
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, university, study_availability")
    .neq("id", me)
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Map user_id -> hobby names */
async function fetchHobbiesFor(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string[]>();
  const { data, error } = await supabase
    .from("user_hobbies")
    .select("user_id, hobby_options(name)");
  if (error) throw error;
  const byUser = new Map<string, string[]>();
  (data ?? []).forEach((row: any) => {
    const uid = row.user_id;
    const name = row.hobby_options?.name ?? null;
    if (!uid || !name) return;
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(name);
  });
  return byUser;
}

/** Map user_id -> academic goal names */
async function fetchAcademicGoalsFor(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string[]>();
  const { data, error } = await supabase
    .from("user_academic_goals")
    .select("user_id, academic_goals_options(name)");
  if (error) throw error;
  const byUser = new Map<string, string[]>();
  (data ?? []).forEach((row: any) => {
    const uid = row.user_id;
    const name = row.academic_goals_options?.name ?? null;
    if (!uid || !name) return;
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(name);
  });
  return byUser;
}

/** Optionally grab one course label per user for the card */
async function fetchFirstCourseFor(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string | null>();
  const { data, error } = await supabase
    .from("user_courses")
    .select("user_id, courses(course_code, course_name)");
  if (error) throw error;
  const byUser = new Map<string, string | null>();
  (data ?? []).forEach((row: any) => {
    const uid = row.user_id;
    const c = row.courses;
    if (!uid) return;
    const label = c ? (c.course_code || c.course_name || null) : null;
    if (!byUser.has(uid)) byUser.set(uid, label);
  });
  return byUser;
}

/** Return candidates with merged fields for UI/scoring */
export async function fetchMatchCandidates(limit = 50): Promise<MatchCandidate[]> {
  const base = await fetchBaseUsers(limit);
  const ids = base.map((u: any) => u.id);

  const [hobbies, goals, firstCourse] = await Promise.all([
    fetchHobbiesFor(ids),
    fetchAcademicGoalsFor(ids),
    fetchFirstCourseFor(ids),
  ]);

  return base.map((u: any) => ({
    id: u.id,
    name: u.full_name || "Student",
    uni: u.university ?? null,
    course: firstCourse.get(u.id) ?? null,
    interests: hobbies.get(u.id) ?? [],
    goals: goals.get(u.id) ?? [],
    availability: Array.isArray(u.study_availability) ? u.study_availability : [],
  }));
}

/** Build a simple “connection status by otherId” index for the buttons */
export type ConnState = "none" | "outgoing-pending" | "incoming-pending" | "accepted";

export async function fetchMyConnectionIndex(): Promise<Record<string, ConnState>> {
  const me = await getMyUserId();
  if (!me) return {};
  const { data, error } = await supabase
    .from("connections")
    .select("user_id, connection_id, status")
    .or(`user_id.eq.${me},connection_id.eq.${me}`);
  if (error) throw error;

  const idx: Record<string, ConnState> = {};
  (data ?? []).forEach((r: any) => {
    const other = r.user_id === me ? r.connection_id : r.user_id;
    const mineIsRequester = r.user_id === me;
    if (r.status === "accepted") idx[other] = "accepted";
    else if (r.status === "pending") idx[other] = mineIsRequester ? "outgoing-pending" : "incoming-pending";
  });
  return idx;
}

/** Create or convert to pending request (PK prevents dupes) */
export async function sendConnectionRequest(targetUserId: string) {
  const me = await getMyUserId();
  if (!me) throw new Error("Not signed in");
  if (me === targetUserId) return;
  const { error } = await supabase
    .from("connections")
    .upsert(
      { user_id: me, connection_id: targetUserId, status: "pending" },
      { onConflict: "user_id,connection_id" }
    );
  if (error) throw error;
}
