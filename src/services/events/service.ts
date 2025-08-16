// src/services/events.service.ts
import { supabase } from "../../lib/supabase";

export interface EventUI {
  id: string;
  title: string;
  time: string;       // formatted for UI, e.g. "Thu, 7:00pm"
  location: string;
  tags: string[];
  attendees: string[]; // user ids
  source: string;
}

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  tags: string[] | null;
  source: string | null;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export async function fetchEvents(): Promise<EventUI[]> {
  const { data: events, error } = await supabase
    .from("events")
    .select("id,title,starts_at,location,tags,source")
    .order("starts_at", { ascending: true });

  if (error) throw error;
  if (!events || events.length === 0) return [];

  const ids = events.map(e => e.id);
  const { data: attendees, error: aErr } = await supabase
    .from("event_attendees")
    .select("event_id,user_id")
    .in("event_id", ids);

  if (aErr) throw aErr;

  const byEvent: Record<string, string[]> = {};
  (attendees ?? []).forEach(a => {
    if (!byEvent[a.event_id]) byEvent[a.event_id] = [];
    byEvent[a.event_id].push(a.user_id);
  });

  return (events as EventRow[]).map(e => ({
    id: e.id,
    title: e.title,
    time: formatTime(e.starts_at),
    location: e.location ?? "",
    tags: e.tags ?? [],
    attendees: byEvent[e.id] ?? [],
    source: e.source ?? "",
  }));
}
