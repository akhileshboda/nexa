//matching.ts

import { supabase } from "./supabase"; // your existing client

export type Profile = {
  user_id: string;
  interests: string[];
  skills: string[];
  degree: string | null;
  campus: string | null;
  year: number | null;
};

export type Suggestion = Profile & { _score: number };

function jaccard(a: string[] = [], b: string[] = []): number {
  if (!a.length && !b.length) return 0;
  const A = new Set(a.map(s => s.toLowerCase()));
  const B = new Set(b.map(s => s.toLowerCase()));
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function scoreCandidate(me: Profile, other: Profile): number {
  if (me.user_id === other.user_id) return -Infinity;

  const wInterests = 0.5;
  const wSkills    = 0.3;
  const bonusDeg   = 0.15;
  const bonusCamp  = 0.05;

  const sInterests = jaccard(me.interests, other.interests);
  const sSkills    = jaccard(me.skills, other.skills);

  const sameDegree = me.degree && other.degree && me.degree === other.degree ? bonusDeg : 0;
  const sameCampus = me.campus && other.campus && me.campus === other.campus ? bonusCamp : 0;

  const y1 = me.year ?? null;
  const y2 = other.year ?? null;
  const yearPenalty = (y1 !== null && y2 !== null)
    ? 0.05 * Math.min(Math.abs(y1 - y2), 4)
    : 0;

  const score = (wInterests * sInterests)
              + (wSkills    * sSkills)
              + sameDegree
              + sameCampus
              - yearPenalty;

  return Number(score.toFixed(4));
}

export async function fetchCandidates(me: Profile, excludeIds: string[] = [], limit = 100): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("user_directory")
    .select("user_id, interests, skills, degree, campus, year")
    .neq("user_id", me.user_id)
    .limit(limit);

  if (error) throw error;

  // client-side exclude (you can push to SQL later)
  const exclude = new Set(excludeIds);
  return (data ?? []).filter(u => !exclude.has(u.user_id)) as Profile[];
}

export async function getSuggestions(
  me: Profile,
  excludeIds: string[] = [],
  limit = 20
): Promise<Suggestion[]> {
  const pool = await fetchCandidates(me, excludeIds, 200); // fetch a pool
  const scored: Suggestion[] = pool.map(u => ({ ...u, _score: scoreCandidate(me, u) }));
  scored.sort((a, b) => b._score - a._score);
  return scored.filter(s => s._score > 0).slice(0, limit);
}
