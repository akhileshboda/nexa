import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Home as HomeIcon,
  PersonStanding,
  MessagesSquare,
  Calendar as CalendarIcon,
  CalendarCheck,
  User as UserIcon,
  X,
  Check,
  MapPin,
  Clock,
  GraduationCap,
  Sparkles,
  Send,
  Info,
  Users,
  Sliders,
  LogOut,
  Plus,
  Filter,
  Bell,
} from "lucide-react";

import { supabase } from "./lib/supabase"; // make sure this exists
// 👇 expose it for debugging in the browser console
; (window as any).supabase = supabase;

import AuthScreen from "./components/AuthScreen";
import Avatar from "./components/Avatar";
import { btnBase, cardBase, chipBase, cx, TextInput, ChipsInput, ToggleRow } from "./components/UI";
import logo from "./assets/logo.png";
import { fetchEvents, type EventUI } from "./services/events/service";

export async function sendTestMessage(groupId: string) {
  const { data: s } = await supabase.auth.getSession();
  const myId = s?.session?.user?.id;
  if (!myId) {
    console.warn("You are not signed in!");
    return;
  }

  const { error } = await supabase.from("messages").insert({
    group_id: groupId,   // <- replace with a real group id
    sender_id: myId,     // must match your logged-in user
    message: "Hello from the app!"
  });

  if (error) console.error(error);
}

// Attach it to window so you can call it from the browser console
; (window as any).sendTestMessage = sendTestMessage;


// ----------------------------------------------------------------------------
// Fixed Options
// ----------------------------------------------------------------------------
const UNI_OPTIONS = [
  "Monash University", "University of Melbourne", "RMIT", "Deakin",
  "Swinburne", "La Trobe"
];

const COURSE_OPTIONS = [
  "Bachelor of IT", "Computer Science", "Software Engineering",
  "Data Science", "Cybersecurity", "Information Systems"
];

const MAJOR_OPTIONS = [
  "Cybersecurity", "Data Science", "AI/ML", "Networks", "Software Development",
  "Human-Computer Interaction", "Information Systems", "Business Analytics"
];

const STUDENT_TYPE_OPTIONS = ["International", "Domestic"];

const ACADEMIC_GOAL_OPTIONS = [
  "HD average", "Dean's List", "Exchange program", "Publish paper",
  "Internship", "Graduate program"
];

const CAREER_ASPIRATION_OPTIONS = [
  "Software Engineer", "Cyber Analyst", "Product Manager",
  "Data Scientist", "UX Designer", "Site Reliability Engineer"
];

const HOBBY_OPTIONS = [
  "Basketball", "Gym", "Photography", "Gaming",
  "Cooking", "Reading", "Hiking", "Music"
];

const AVAILABILITY_OPTIONS = [
  "Mon AM", "Mon PM", "Tue AM", "Tue PM", "Wed AM", "Wed PM",
  "Thu AM", "Thu PM", "Fri AM", "Fri PM", "Weekend"
];

const STUDY_STYLE_OPTIONS = ["Solo", "Pair", "Group"];
const GROUP_SIZE_OPTIONS = ["2", "3–4", "5+"];
const FREQUENCY_OPTIONS = ["1× / week", "2× / week", "3× / week", "Daily"];


// -----------------------------------------------------------------------------
// Utilities & Storage
// -----------------------------------------------------------------------------
const storage = {
  get(key: string, fallback: any) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  del(key: string) {
    localStorage.removeItem(key);
  },
};

// -----------------------------------------------------------------------------
// Mock Data & Types
// -----------------------------------------------------------------------------
interface User {
  id: string;

  // Identity
  name: string;            // display name (can keep using)
  firstName?: string;
  lastName?: string;
  dob?: string;            // dd/MM/yyyy

  // Home
  homeCountry?: string;
  homeTown?: string;
  from?: string;

  // Education
  uni: string;
  course: string;
  major?: string;
  year: number;
  studentType?: "International" | "Domestic";

  // Goals & interests
  academicGoals?: string[];       // NEW (distinct from "goals" if you want)
  careerAspirations?: string[];   // NEW
  hobbies?: string[];             // NEW
  interests: string[];            // existing (you can keep using this too)
  goals: string[];                // existing (you can keep or repurpose)

  // Study prefs
  learning: {
    style: string;
    groupSize: string;
    frequency: string;            // “Study availability frequency”
  };

  // Availability
  availability: string[];

  socialBreak?: boolean;
  privacy?: {
    showLocation: boolean;
    shareProfileWithMatchesOnly: boolean;
  };

  compatibilityHints?: string[];
  seed?: number;
}

interface EventItem {
  id: string;
  title: string;
  time: string;
  location: string;
  tags: string[];
  attendees: string[];
  source: string;
}

interface Message {
  from: 'me' | 'them';
  text: string;
}

const SAMPLE_PROFILES: User[] = [
  {
    id: "u1",
    name: "Lina Zhang",
    uni: "Monash University",
    course: "Bachelor of IT",
    year: 2,
    from: "China",
    interests: ["Frontend", "UI/UX", "Basketball", "Bubble tea"],
    goals: ["Front‑end dev role", "Portfolio projects"],
    learning: { style: "Visual", groupSize: "2–4", frequency: "2x/week" },
    availability: ["Mon AM", "Wed PM", "Fri AM"],
    compatibilityHints: [
      "Also enrolled in FIT1045",
      "Shared interest: Basketball",
      "Goal alignment: Front‑end pathway",
    ],
    seed: 0,
  },
  {
    id: "u2",
    name: "Arjun Mehta",
    uni: "UniMelb",
    course: "BSc (CS)",
    year: 3,
    from: "India",
    interests: ["Cybersecurity", "CTF", "Badminton", "Coffee"],
    goals: ["Security internships", "Blue team skills"],
    learning: { style: "Hands‑on", groupSize: "3", frequency: "Weekly" },
    availability: ["Tue PM", "Thu PM", "Sat"],
    compatibilityHints: [
      "Also exploring cybersecurity minor",
      "Mutual interest: Coffee meetups",
    ],
    seed: 1,
  },
  {
    id: "u3",
    name: "Maya Rossi",
    uni: "RMIT",
    course: "Software Engineering",
    year: 1,
    from: "Italy",
    interests: ["Mobile Apps", "React Native", "Hiking"],
    goals: ["Find study group", "Build routine"],
    learning: { style: "Discussion", groupSize: "3–4", frequency: "3x/week" },
    availability: ["Mon PM", "Wed PM", "Sun"],
    compatibilityHints: [
      "First‑year friendly",
      "Group size preference matches",
    ],
    seed: 2,
  },
  {
    id: "u4",
    name: "Tom Nguyen",
    uni: "Monash University",
    course: "Computer Science",
    year: 2,
    from: "Vietnam",
    interests: ["Data Science", "Basketball", "Anime"],
    goals: ["Kaggle comps", "Internship-ready"],
    learning: { style: "Practice", groupSize: "2", frequency: "Weekly" },
    availability: ["Fri PM", "Sat", "Sun"],
    compatibilityHints: ["Shared sport: Basketball"],
    seed: 3,
  },
  {
    id: "u5",
    name: "Sara Ali",
    uni: "Deakin",
    course: "Cybersecurity",
    year: 2,
    from: "UAE",
    interests: ["OffSec", "Women in Tech", "Tea"],
    goals: ["Study partner", "Portfolio security labs"],
    learning: { style: "Project‑based", groupSize: "2–3", frequency: "2x/week" },
    availability: ["Tue AM", "Thu PM"],
    compatibilityHints: ["Also doing blue‑team labs"],
    seed: 4,
  },
];

const SAMPLE_EVENTS: EventItem[] = [
  {
    id: "e1",
    title: "Women in Cyber – Blue Team 101",
    time: "Thu, 7:00pm",
    location: "Monash Caulfield – B3.08",
    tags: ["Cyber", "Workshop"],
    attendees: ["u1", "u5"],
    source: "Luma",
  },
  {
    id: "e2",
    title: "FIT1045 Study Sprint – Week 5",
    time: "Sat, 11:00am",
    location: "Hunt Library – Level 2",
    tags: ["Study", "FIT1045"],
    attendees: ["u1", "u4"],
    source: "Discord",
  },
  {
    id: "e3",
    title: "Careers: Front‑End Pathways AMA",
    time: "Sun, 4:00pm",
    location: "Online (Zoom)",
    tags: ["Career", "Frontend"],
    attendees: ["u3"],
    source: "Club Announcements",
  },
];

const SEEDED_MESSAGES: Record<string, Message[]> = {
  u2: [
    { from: "them", text: "Hey! Want to try a blue‑team lab this week?" },
    { from: "me", text: "Sounds good. Thu evening works for me." },
  ],
  u3: [{ from: "them", text: "Are you around campus on Wednesday?" }],
};

const DEFAULT_USER: User = {
  id: "me",
  name: "You",
  firstName: "",
  lastName: "",
  dob: "",
  homeCountry: "",
  homeTown: "",
  uni: "Monash University",
  course: "Bachelor of IT",
  major: "",
  year: 2,
  studentType: undefined,
  academicGoals: [],
  careerAspirations: [],
  hobbies: [],
  goals: [],
  interests: [],
  learning: { style: "", groupSize: "", frequency: "" },
  availability: [],
  socialBreak: false,
  privacy: { showLocation: false, shareProfileWithMatchesOnly: true },
};


// Simple rule-based score (null/undefined safe)
export function scoreMatch(me?: User | null, other?: User | null): number {
  if (!me || !other) return 0;
  let s = 0;

  // same primary course code (e.g., "FIT2004 Algorithms")
  const meCourse = me.course?.split(" ")?.[0];
  const otherCourse = other.course?.split(" ")?.[0];
  if (meCourse && otherCourse && meCourse === otherCourse) s += 2;

  // same uni
  if (me.uni && other.uni && me.uni === other.uni) s += 2;

  // common interests / goals / availability
  const interestsA = Array.isArray(me.interests) ? me.interests : [];
  const interestsB = Array.isArray(other.interests) ? other.interests : [];
  const goalsA = Array.isArray(me.goals) ? me.goals : [];
  const goalsB = Array.isArray(other.goals) ? other.goals : [];
  const availA = Array.isArray(me.availability) ? me.availability : [];
  const availB = Array.isArray(other.availability) ? other.availability : [];

  const commonInterests = interestsA.filter(i => interestsB.includes(i)).length;
  s += commonInterests * 1.5;

  const goalOverlap = goalsA.filter(g => goalsB.includes(g)).length;
  s += goalOverlap * 1.5;

  const availOverlap = availA.filter(a => availB.includes(a)).length;
  s += availOverlap * 1.25;

  return Math.round(s * 10) / 10;
}

// --- Minimal UI tokens (Tailwind) ---
const ui = {
  card: "rounded-2xl border border-neutral-200 bg-white p-4",
  button: "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-neutral-200 hover:bg-neutral-50 active:scale-[.98] transition",
  primary: "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-600/90 active:scale-[.98] transition",
  input: "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition",
  listItem: "w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-neutral-50 transition",
  badge: "grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white text-xs font-semibold shadow-sm",
};

// Short, single-line time like 16:09
function formatTime(ts?: string) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}



// ---------- Supabase chat helpers (Groups + DMs) ----------
// (Assumes tables: conversations, conversation_members, messages(conversation_id,sender_id,text,created_at)
// and user_directory(email -> user_id))

// Replace DM "Direct Message" with the other person's email/name
async function decorateConversations(convs: any[]) {
  if (!convs.length) return [];

  const ids = convs.map(c => c.id);

  // Get members for these conversations
  const { data: mems } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("conversation_id", ids);

  const me = await getMyUserId();

  // Map conv → members
  const byConv: Record<string, string[]> = {};
  (mems || []).forEach(m => {
    if (!byConv[m.conversation_id]) byConv[m.conversation_id] = [];
    byConv[m.conversation_id].push(m.user_id);
  });

  // Collect other user ids for DMs
  const otherIds = new Set<string>();
  convs.forEach(c => {
    if (c.is_dm && byConv[c.id]) {
      const otherUserId = byConv[c.id].find(uid => uid !== me);
      if (otherUserId) otherIds.add(otherUserId);
    }
  });

  // Lookup their emails (or names if you add that column)
  let users: { user_id: string; email: string }[] = [];
  if (otherIds.size > 0) {
    const { data } = await supabase
      .from("user_directory")
      .select("user_id, email")
      .in("user_id", Array.from(otherIds));
    users = data || [];
  }
  const emailById = new Map(users.map(u => [u.user_id, u.email]));

  // Attach `title`
  return convs.map(c => {
    let title = c.name || "Group";
    if (c.is_dm && byConv[c.id]) {
      const otherUserId = byConv[c.id].find(uid => uid !== me);
      title = emailById.get(otherUserId || "") || "Direct Message";
    }
    return { ...c, title };
  });
}



async function getMyUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_directory")
    .select("user_id")
    .eq("email", email.trim().toLowerCase())
    .single();
  return data?.user_id ?? null;
}

// Chat log: all conversations I'm in, with last-message preview
async function listMyConversations() {
  const me = await getMyUserId();
  if (!me) return [];

  const { data: mems } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", me);

  const ids = (mems || []).map(m => m.conversation_id);
  if (!ids.length) return [];

  const { data: convs } = await supabase
    .from("conversations")
    .select("id, name, is_dm, created_at")
    .in("id", ids)
    .order("created_at", { ascending: false });

  if (!convs?.length) return [];

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, conversation_id, text, created_at, sender_id")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false });

  const lastByConv = new Map<string, any>();
  (msgs || []).forEach(m => {
    if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
  });

  const enriched = convs.map(c => ({ ...c, lastMessage: lastByConv.get(c.id) || null }));
  return await decorateConversations(enriched);


}

// Open or create a DM by email
async function openOrCreateDMByEmail(email: string): Promise<string | null> {
  const other = await getUserIdByEmail(email);
  if (!other) return null;

  const me = await getMyUserId();
  if (!me) return null;

  // find any conversation both users are in
  const { data: myMems } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", me);
  const myIds = (myMems || []).map(m => m.conversation_id);

  if (myIds.length) {
    const { data: overlap } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", other)
      .in("conversation_id", myIds);
    if (overlap?.length) return overlap[0].conversation_id as string;
  }

  // create a new DM conversation + add both members
  const { data: c } = await supabase
    .from("conversations")
    .insert({ is_dm: true })
    .select("id")
    .single();
  if (!c) return null;

  await supabase.from("conversation_members").insert([
    { conversation_id: c.id, user_id: me },
    { conversation_id: c.id, user_id: other },
  ]);

  return c.id as string;
}

// Create a named group and add emails (+you)
async function createGroupByEmails(name: string, emails: string[]): Promise<string | null> {
  const me = await getMyUserId();
  if (!me) return null;

  const { data: c } = await supabase
    .from("conversations")
    .insert({ name: name.trim(), is_dm: false })
    .select("id")
    .single();
  if (!c) return null;

  const { data: rows } = await supabase
    .from("user_directory")
    .select("user_id")
    .in("email", emails.map(e => e.trim().toLowerCase()));

  const ids = new Set<string>([me]);
  (rows || []).forEach(r => r.user_id && ids.add(r.user_id));

  await supabase.from("conversation_members").insert(
    Array.from(ids).map(uid => ({ conversation_id: c.id, user_id: uid }))
  );

  return c.id as string;
}

// Messages in a conversation (used by right pane)
async function listMessages(conversationId: string) {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return data || [];
}

// Send a message to the selected conversation
async function sendMessage(conversationId: string, text: string) {
  const me = await getMyUserId();
  if (!me || !text.trim()) return;
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: me,
    text: text.trim(),
  });
}

// Realtime: only new messages for this conversation
function subscribeToConversation(conversationId: string, onNew: (row: any) => void) {
  const channel = supabase
    .channel(`conv:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onNew(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}


// -----------------------------------------------------------------------------
// Main App
// -----------------------------------------------------------------------------
export default function App() {
  // 🔹 Realtime messages debug subscription
  useEffect(() => {
    const channel = supabase
      .channel("debug")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          console.log("Realtime debug – new row:", payload.new);
        }
      )
      .subscribe();

    return () => {
      // clean up on unmount
      supabase.removeChannel(channel);
    };
  }, []);

  // 🔹 Local state
  const [tab, setTab] = useState("home");
  const [me, setMe] = useState(() => storage.get("nexa_me", DEFAULT_USER));
  const [onboarded, setOnboarded] = useState(() => storage.get("nexa_onboarded", false));
  const [likes, setLikes] = useState(() => storage.get("nexa_likes", []));
  const [skips, setSkips] = useState(() => storage.get("nexa_skips", []));
  const [filters, setFilters] = useState<string[]>([]); // event tags
  // My Supabase user id (for RSVP) and modal visibility
  const [myId, setMyId] = useState<string | null>(null);
  const [myEventsOpen, setMyEventsOpen] = useState(false);

  // 🔹 Auth state
  const [authed, setAuthed] = useState(() => storage.get("nexa_authed", false));
  const [currentEmail, setCurrentEmail] = useState(() => storage.get("nexa_current_email", ""));

  // 🔹 Persist state in local storage
  useEffect(() => storage.set("nexa_authed", authed), [authed]);
  useEffect(() => storage.set("nexa_current_email", currentEmail), [currentEmail]);
  useEffect(() => storage.set("nexa_me", me), [me]);
  useEffect(() => storage.set("nexa_onboarded", onboarded), [onboarded]);
  useEffect(() => storage.set("nexa_likes", likes), [likes]);
  useEffect(() => storage.set("nexa_skips", skips), [skips]);

  // Events
  // import the type EventUI (see fix #2)
  const [events, setEvents] = useState<EventUI[]>([]);

  async function refreshEvents() {
    try {
      const fresh = await fetchEvents();
      setEvents(fresh);
    } catch (e) {
      console.error("refreshEvents failed", e);
    }
  }

  useEffect(() => { refreshEvents(); }, []);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch((err) => console.error("Failed to fetch events", err));
  }, []);



  // 🔹 User registry management
  const getUsers = () => storage.get("nexa_users", []);
  const setUsers = (arr: any[]) => storage.set("nexa_users", arr);

  // 🟢 Keep authed flag in sync with Supabase session
  useEffect(() => {
    // Check on load
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthed(true);
        setCurrentEmail(data.session.user?.email ?? "");
      } else {
        setAuthed(false);
        setCurrentEmail("");
      }
    });

    // Subscribe to login/logout events
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      setCurrentEmail(session?.user?.email ?? "");
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    getMyUserId().then(setMyId);
  }, [authed]);

  // Put me in user_directory so others can find me by email
  useEffect(() => {
    async function upsertDirectory() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user?.id || !user.email) return;
      await supabase
        .from("user_directory")
        .upsert({ user_id: user.id, email: user.email }, { onConflict: "user_id" });
    }
    if (authed) upsertDirectory();
  }, [authed]);



  // 🔹 Sign in
  async function handleSignIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Sign-in failed:", error.message);
      return false;
    }
    setAuthed(true);
    setCurrentEmail(data.user?.email ?? "");
    if (!me.name || me.name === "You") {
      setMe({ ...me, name: data.user?.user_metadata?.full_name || me.name || "Student" });
    }
    return true;
  }

  // 🔹 Register
  async function handleRegister(name: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      console.error("Registration failed:", error.message);
      return false;
    }

    if (data.user) {
      setAuthed(true);
      setCurrentEmail(data.user.email ?? "");
      if (!me.name || me.name === "You") setMe({ ...me, name });
    }
    return true;
  }

  // 🔹 Logout
  async function handleLogout() {
    await supabase.auth.signOut();
    setAuthed(false);
    setCurrentEmail("");
    resetDemo();
  }

  async function handleRSVP(eventId: string) {
  const uid = await getMyUserId();
  if (!uid) { alert("Please sign in to RSVP."); return; }

  const { error } = await supabase
    .from("event_attendees")
    .upsert(
      { event_id: eventId, user_id: uid },
      { onConflict: "event_id,user_id", ignoreDuplicates: true }
    );

  if (error) { console.error("RSVP failed:", error.message); alert("Sorry, RSVP failed."); return; }

  // optimistic UI
  setEvents(prev =>
    prev.map(ev => ev.id === eventId
      ? { ...ev, attendees: Array.from(new Set([...(ev.attendees || []), uid])) }
      : ev));

  // sync with DB
  await refreshEvents();
}

async function handleCancelRSVP(eventId: string) {
  const uid = await getMyUserId();
  if (!uid) { alert("Please sign in to update your RSVP."); return; }

  const { error } = await supabase
    .from("event_attendees")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", uid);

  if (error) { console.error("Cancel RSVP failed:", error.message); alert("Sorry, we couldn’t cancel your RSVP."); return; }

  // optimistic UI
  setEvents(prev =>
    prev.map(ev => ev.id === eventId
      ? { ...ev, attendees: (ev.attendees || []).filter(id => id !== uid) }
      : ev));

  // sync with DB
  await refreshEvents();
}




  // 🔹 Helpers
  const pool = useMemo(() => SAMPLE_PROFILES, []);
  const likedUsers = pool.filter((p) => likes.includes(p.id));

  // Compute candidate list sorted by score
  const candidates = useMemo(() => {
    const unseen = pool.filter((p) => !likes.includes(p.id) && !skips.includes(p.id));
    return unseen
      .map((p) => ({ profile: p, score: scoreMatch(me, p) }))
      .sort((a, b) => b.score - a.score);
  }, [likes, skips, me, pool]);

  const topCandidate = candidates[0];

  function like(id: string) {
    setLikes((prev) => [...new Set([...prev, id])]);
  }
  function skip(id: string) {
    setSkips((prev) => [...new Set([...prev, id])]);
  }

  function createGroupSuggestion() {
    const scored = likedUsers
      .map((p) => ({ profile: p, score: scoreMatch(me, p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.profile);
    return scored;
  }


  function resetDemo() {
    storage.del("nexa_me");
    storage.del("nexa_onboarded");
    storage.del("nexa_likes");
    storage.del("nexa_skips");
    setMe(DEFAULT_USER);
    setOnboarded(false);
    setLikes([]);
    setSkips([]);
    setTab("home");
  }

  // 🟢 Show auth screen if not authenticated
  if (!authed) {
    return <AuthScreen onSignIn={handleSignIn} onRegister={handleRegister} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 text-neutral-900">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Nexa" className="h-20 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <button
                className={cx(btnBase, "border bg-white")}
                onClick={() => alert("Notifications are simulated in this MVP.")}
              >
                <Bell className="h-4 w-4" />
              </button>
              <button
                className={cx(btnBase, "border bg-white")}
                onClick={() => setMyEventsOpen(true)}
                title="My Events"
              >
                <CalendarCheck className="h-4 w-4" />
              </button>
              <button className={cx(btnBase, "border bg-white")} onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 pb-24">
          {tab === "home" && (
            <HomeScreen
              me={me}
              setTab={setTab}
              likes={likes}
              topCandidate={topCandidate}
              onboarded={onboarded}
              setOnboarded={setOnboarded}
            />
          )}
          {tab === "matches" && (
            <MatchScreen
              me={me}
              candidate={topCandidate}
              onLike={() => topCandidate && like(topCandidate.profile.id)}
              onSkip={() => topCandidate && skip(topCandidate.profile.id)}
              likedUsers={likedUsers}
              suggestGroup={createGroupSuggestion}
            />
          )}
          {tab === "messages" && (
            <MessagesScreen pool={pool} />
          )}
          {tab === "events" && (
            <EventsScreen
              pool={pool}
              events={events}          // ✅ new
              filters={filters}
              setFilters={setFilters}
              me={me}
              myId={myId}
              onRSVP={handleRSVP}
              onCancelRSVP={handleCancelRSVP}
            />
          )}
          {tab === "profile" && (
            <ProfileScreen me={me} setMe={setMe} setOnboarded={setOnboarded} />
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/90 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2 py-2 text-xs">
            <NavItem icon={<HomeIcon />} label="Home" active={tab === "home"} onClick={() => setTab("home")} />
            <NavItem icon={<PersonStanding />} label="Matches" active={tab === "matches"} onClick={() => setTab("matches")} />
            <NavItem icon={<MessagesSquare />} label="Messages" active={tab === "messages"} onClick={() => setTab("messages")} />
            <NavItem icon={<CalendarIcon />} label="Events" active={tab === "events"} onClick={() => setTab("events")} />
            <NavItem icon={<UserIcon />} label="Profile" active={tab === "profile"} onClick={() => setTab("profile")} />
          </div>
        </nav>
      </div>

      {/* My Events modal */}
      {myEventsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur"
          onClick={() => setMyEventsOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex min-h-[100svh] items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="text-lg font-semibold">My Events</div>
                <button
                  className={cx(btnBase, "border bg-white")}
                  onClick={() => setMyEventsOpen(false)}
                >
                  Close
                </button>
              </div>

              {!myId ? (
                <div className="text-sm text-neutral-600">Sign in to see your RSVPs.</div>
              ) : (
                <>
                  {events.filter((ev) => (ev.attendees || []).includes(myId)).length === 0 ? (
                    <div className="text-sm text-neutral-600">
                      You haven’t RSVP’d to anything yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {events
                        .filter((ev) => (ev.attendees || []).includes(myId))
                        .map((e) => (
                          <div key={e.id} className="rounded-xl border bg-white p-4">
                            <div className="text-sm font-semibold truncate">{e.title}</div>
                            <div className="grid grid-cols-2 gap-4">
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {e.time}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> {e.location}
                              </span>                      
                            </div>
                            {/* Cancel RSVP button */}
                              <div className="mt-3">
                                <button
                                  className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                                  onClick={() => handleCancelRSVP(e.id)}
                                >
                                  Cancel RSVP
                                </button>
                                </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Onboarding overlay */}
      {!onboarded && <Onboarding me={me} setMe={setMe} setOnboarded={setOnboarded} />}
    </div>
  );
}




// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------
function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex flex-col items-center rounded-xl px-2 py-1.5",
        active ? "text-indigo-600" : "text-neutral-500"
      )}
    >
      <div className={cx("grid place-items-center", active && "scale-105")}>
        {React.cloneElement(icon, { className: "h-5 w-5" })}
      </div>
      <span className="mt-0.5 text-[11px]">{label}</span>
    </button>
  );
}

function useClickOutside(ref: React.RefObject<HTMLElement>, onAway: () => void) {
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onAway();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onAway]);
}

// SINGLE-SELECT searchable dropdown
function DropdownSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyText = "No matches",
}: {
  label: string;
  options: string[];
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const wrapRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(wrapRef, () => setOpen(false));

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter(o => o.toLowerCase().includes(t)) : options;
  }, [q, options]);

  return (
    <div className="relative" ref={wrapRef}>
      <div className="mb-1 text-xs font-medium text-neutral-700">{label}</div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-xl border bg-white px-3 py-2 text-left text-sm"
      >
        {value || <span className="text-neutral-400">Select…</span>}
      </button>

      {open && (
        <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border bg-white shadow">
          <div className="p-2">
            <TextInput value={q} onChange={setQ} placeholder={placeholder} />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-neutral-500">{emptyText}</div>
            )}
            {filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); setQ(""); }}
                className={cx(
                  "block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50",
                  value === opt && "bg-indigo-50"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// MULTI-SELECT searchable dropdown
function DropdownMultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyText = "No matches",
  max,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  max?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const wrapRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(wrapRef, () => setOpen(false));

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter(o => o.toLowerCase().includes(t)) : options;
  }, [q, options]);

  const toggle = (opt: string) => {
    const exists = value.includes(opt);
    if (exists) onChange(value.filter(v => v !== opt));
    else {
      if (max && value.length >= max) return;
      onChange([...value, opt]);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div className="mb-1 text-xs font-medium text-neutral-700">{label}</div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-xl border bg-white px-3 py-2 text-left text-sm"
      >
        {value.length
          ? <span className="flex flex-wrap gap-1">
            {value.slice(0, 3).map(v => (
              <span key={v} className="rounded-full border px-2 py-0.5 text-xs">
                {v}
              </span>
            ))}
            {value.length > 3 && <span className="text-xs text-neutral-500">+{value.length - 3}</span>}
          </span>
          : <span className="text-neutral-400">Select…</span>}
      </button>

      {open && (
        <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border bg-white shadow">
          <div className="p-2">
            <TextInput value={q} onChange={setQ} placeholder={placeholder} />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-neutral-500">{emptyText}</div>
            )}
            {filtered.map(opt => {
              const selected = value.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={cx(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  )}
                >
                  <span>{opt}</span>
                  {selected && <Check className="h-4 w-4 text-indigo-600" />}
                </button>
              );
            })}
          </div>
          {max && (
            <div className="border-t px-3 py-1.5 text-[11px] text-neutral-500">
              {value.length}/{max} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}




function HomeScreen({ me, setTab, likes, topCandidate, onboarded, setOnboarded }: any) {
  return (
    <div className="space-y-4">
      <HeroCard me={me} onboarded={onboarded} setOnboarded={setOnboarded} />

      <div className="grid grid-cols-1 gap-4">
        {/* AI Suggestion */}
        <div className={cardBase}>
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-indigo-600" />
            <div>
              <div className="text-sm font-semibold">Proactive Suggestion</div>
              <p className="mt-1 text-sm text-neutral-600">
                {topCandidate ? (
                  <>
                    "Hey, {topCandidate.profile.name} looks like a strong fit. Want to start a chat?"
                  </>
                ) : (
                  <>You're all caught up! Explore events to meet more students.</>
                )}
              </p>
              <div className="mt-3 flex gap-2">
                <button className={cx(btnBase, "bg-neutral-900 text-white")} onClick={() => setTab("matches")}>
                  Find Study Buddies
                </button>
                <button className={cx(btnBase, "border bg-white")} onClick={() => setTab("events")}>
                  See Events
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-3">
          <div className={cardBase}>
            <div className="text-xs text-neutral-500">Connections</div>
            <div className="mt-1 text-2xl font-semibold">{likes.length}</div>
          </div>
        </div>

        {/* How it works */}
        <div className={cardBase}>
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5" />
            <div>
              <div className="text-sm font-semibold">Designed for genuine connection</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700">
                <li>No public feeds or achievement flexing</li>
                <li>Curated matches based on goals, interests, and availability</li>
                <li>Groups of 3–4 for focused study and support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroCard({ me, onboarded, setOnboarded }: any) {
  return (
    <div className={cx(cardBase, "overflow-hidden p-0")}>
      <div className="relative">
        <div className="h-28 w-full bg-gradient-to-br from-indigo-500 to-cyan-500" />
        <div className="absolute -bottom-9 left-4 flex flex-col items-center">
          <Avatar name={me.name || "You"} size={64} seed={5} />
          <button
            type="button"
            onClick={() => (window.location.href = "/settings/profile")}
            className="mt-1 text-[11px] font-medium text-indigo-600 hover:underline focus:underline focus:outline-none"
            aria-label="Edit profile photo"
          >
            Edit
          </button>
        </div>
      </div>
      <div className="px-4 pb-4 pt-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-500">Welcome</div>
            <div className="text-lg font-semibold">{me.name || "Student"}</div>
          </div>
          {!onboarded && (
            <button
              className={cx(btnBase, "bg-neutral-900 text-white")}
              onClick={() => setOnboarded(false)}
            >
              Complete Profile
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(me.interests || []).slice(0, 3).map((i: string) => (
            <span key={i} className={cx(chipBase, "border-neutral-200 bg-white")}>{i}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchScreen({ me, candidate, onLike, onSkip, likedUsers, suggestGroup }: any) {
  const group = suggestGroup();
  return (
    <div className="space-y-4">
      {/* Current card */}
      <div className={cardBase}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Suggested Match</div>
          <div className="text-xs text-neutral-500">Swipe‑like actions</div>
        </div>
        {candidate ? (
          <div className="mt-3">
            <ProfileCard profile={candidate.profile} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className={cx(btnBase, "border bg-white")} onClick={onSkip}>
                <X className="mr-2 h-4 w-4" /> Skip
              </button>
              <button className={cx(btnBase, "bg-indigo-600 text-white")} onClick={onLike}>
                <Check className="mr-2 h-4 w-4" /> Connect
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-neutral-600">No more suggestions for now. Check Events to meet more students.</div>
        )}
      </div>

      {/* Group suggestion */}
      <div className={cardBase}>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Suggested Study Group</div>
        {group.length ? (
          <div className="space-y-3">
            {group.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3">
                <Avatar name={p.name} size={36} seed={p.seed} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-neutral-600">{p.course} • {p.uni}</div>
                </div>
                <span className={cx(chipBase, "border-neutral-200 bg-white")}>
                  {p.learning.groupSize} ppl
                </span>
              </div>
            ))}
            <button className={cx(btnBase, "w-full bg-neutral-900 text-white")}>Start Group Chat</button>
          </div>
        ) : (
          <div className="text-sm text-neutral-600">Like a few profiles to get a smart group suggestion.</div>
        )}
      </div>

      {/* Your likes */}
      <div className={cardBase}>
        <div className="mb-2 text-sm font-semibold">Your Likes</div>
        {likedUsers.length ? (
          <div className="space-y-3">
            {likedUsers.map((p: any) => (
              <CompactProfile key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-neutral-600">You haven't liked anyone yet.</div>
        )}
      </div>
    </div>
  );
}

function ProfileCard({ profile, }: any) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar name={profile.name} size={56} seed={profile.seed} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="truncate text-sm font-semibold">{profile.name}</div>
          </div>
          <div className="mt-0.5 text-xs text-neutral-600">
            <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {profile.course}</span>
            <span className="mx-1">•</span>
            <span>Y{profile.year}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.interests.slice(0, 4).map((tag: string) => (
              <span key={tag} className={cx(chipBase, "border-neutral-200 bg-white")}>{tag}</span>
            ))}
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-neutral-700">Why this match</div>
            <ul className="mt-1 list-disc pl-5 text-xs text-neutral-600">
              {profile.compatibilityHints.map((h: string, i: number) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
            <MapPin className="h-3.5 w-3.5" />
            {profile.from} • {profile.uni}
            <span className="mx-1">•</span>
            <Clock className="h-3.5 w-3.5" />
            Availability: {profile.availability.join(", ")}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactProfile({ p }: any) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
      <Avatar name={p.name} size={36} seed={p.seed} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{p.name}</div>
        <div className="text-xs text-neutral-600 truncate">{p.course} • {p.uni}</div>
      </div>
      <button className={cx(btnBase, "border bg-white text-xs")} onClick={() => alert("In a full build, this opens their profile.")}>View</button>
    </div>
  );
}

// ---- Chat Screen (left: chat log, right: messages) ----

function MessagesScreen() {
  // LEFT: chat log state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // DM and Group creation
  const [dmEmail, setDmEmail] = useState("");
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupEmails, setGroupEmails] = useState("");

  // RIGHT: current thread state
  const [thread, setThread] = useState<any[]>([]);
  const unsubRef = useRef<null | (() => void)>(null);

  // --- Load chat log + auto-select latest ---
  async function refreshConversations() {
    const rows = await listMyConversations();
    setConversations(rows);
    if (!selectedId && rows.length) {
      setSelectedId(rows[0].id); // auto-select newest so right pane isn’t blank
    }
  }
  useEffect(() => { refreshConversations(); /* on mount */ }, []); // no deps

  // --- Open a DM by email ---
  async function handleOpenDM() {
    const cid = await openOrCreateDMByEmail(dmEmail);
    if (!cid) { alert("User not found or could not create DM."); return; }
    setSelectedId(cid);
    setDmEmail("");
    refreshConversations();
  }

  // --- Create a named group ---
  async function handleCreateGroup() {
    const emails = groupEmails.split(",").map(s => s.trim()).filter(Boolean);
    if (!groupName.trim() || emails.length === 0) {
      alert("Enter a group name and at least one email.");
      return;
    }
    const cid = await createGroupByEmails(groupName, emails);
    if (!cid) { alert("Could not create group."); return; }
    setNewGroupOpen(false);
    setGroupName("");
    setGroupEmails("");
    setSelectedId(cid);
    refreshConversations();
  }

  // --- Load & subscribe to messages when selection changes ---
  useEffect(() => {
    unsubRef.current?.();             // stop previous subscription
    if (!selectedId) { setThread([]); return; }

    (async () => {
      setThread(await listMessages(selectedId));
      unsubRef.current = subscribeToConversation(selectedId, (row) => {
        setThread(prev => [...prev, row]);
        // keep previews fresh
        refreshConversations();
      });
    })();

    return () => unsubRef.current?.();
  }, [selectedId]);

  return (
    <div className="grid grid-rows-[auto,1fr] gap-4">
      {/* LEFT: Chat log */}
      <div className={`${ui.card} p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Chats</h3>
          <button className={ui.button} onClick={refreshConversations}>Refresh</button>
        </div>

        {/* Start DM */}
        <div className="mb-3 flex gap-2">
          <input
            className={ui.input}
            placeholder="friend@example.com"
            value={dmEmail}
            onChange={(e) => setDmEmail(e.target.value)}
          />
          <button className={ui.button} onClick={handleOpenDM} disabled={!dmEmail.trim()}>
            DM
          </button>
        </div>

        {/* New Group */}
        <button className={`${ui.button} w-full mb-3`}>
          <span onClick={() => setNewGroupOpen(true)}>New Group</span>
        </button>

        {/* Conversation list */}
        <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
          {conversations.length === 0 && (
            <div className="py-10 text-center text-sm text-neutral-500">No chats yet.</div>
          )}

          {conversations.map((c) => {
            const last = c.lastMessage;
            const active = selectedId === c.id;
            // title: use your decorated title if you added it; otherwise fallback
            const title = c.title || (c.is_dm ? "Direct Message" : (c.name || "Group"));
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`${ui.listItem} ${active ? "ring-2 ring-indigo-100 bg-neutral-50" : ""}`}
              >
                <div className={ui.badge}>
                  {(c.is_dm ? (title?.[0]?.toUpperCase() || "D") : (c.name ? c.name[0]?.toUpperCase() : "G"))}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-medium">{title}</div>
                    <div className="shrink-0 text-[10px] text-neutral-500">{formatTime(last?.created_at)}</div>
                  </div>
                  <div className="truncate text-xs text-neutral-600">
                    {last ? last.text : "No messages yet"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>


      {/* RIGHT: Active conversation */}
      <div className={ui.card}>
         {selectedId ? (
           <ChatBox
             conversationId={selectedId}
             messages={thread}
             onSend={(t) => sendMessage(selectedId, t)}
           />
         ) : (
           <div className="text-sm text-neutral-600">Select a chat or start one.</div>
         )}
      </div>

      {/* Modal: Create Group */}
      {newGroupOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setNewGroupOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-sm font-semibold">Create Group</div>
            <input
              className="mb-2 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <textarea
              className="mb-3 w-full rounded-xl border px-3 py-2 text-sm"
              rows={3}
              placeholder="Emails separated by commas"
              value={groupEmails}
              onChange={(e) => setGroupEmails(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => setNewGroupOpen(false)}>Cancel</button>
              <button className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white" onClick={handleCreateGroup}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatBox({
  conversationId,
  messages,
  onSend,
}: {
  conversationId: string;
  messages: any[];
  onSend: (t: string) => void;
}) {
  const [text, setText] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getMyUserId().then(setMyId); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className={ui.card}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Chat</h3>
      </div>

      <div className="h-[60vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4">
        {messages.map((m: any, i: number) => {
          const fromMe = m.sender_id === myId;
          return (
            <div key={m.id ?? `${m.created_at}-${i}`} className={`mb-2 flex ${fromMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm
                ${fromMe ? "bg-indigo-600 text-white" : "bg-neutral-100 text-neutral-900"}`}
              >
                <div>{m.text}</div>
                <div className={`mt-1 text-[10px] ${fromMe ? "text-white/70" : "text-neutral-500"}`}>
                  {new Date(m.created_at).toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          await onSend(t);
          setText("");
        }}
      >
        <input
          className={`${ui.input} flex-1`}
          placeholder="Write a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className={ui.primary}>Send</button>
      </form>
    </div>
  );
}


function EventsScreen({ events, filters, setFilters, onRSVP, onCancelRSVP, myId }: {
  events: EventUI[];
  filters: string[];
  setFilters: (v: string[]) => void;
  onRSVP: (id: string) => void;
  onCancelRSVP: (id: string) => void; 
  myId: string | null;
}) {
  const [sourceFilters, setSourceFilters] = React.useState<string[]>([]);

  const toggleTag = (t: string) =>
    setFilters((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const toggleSource = (s: string) =>
    setSourceFilters((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const amGoing = React.useCallback(
  (ev: EventUI) => Boolean(myId && (ev.attendees || []).includes(myId)),
  [myId]
);

  // Sources (+counts) from all events
  const availableSources = React.useMemo(() => {
    const m = new Map<string, number>();
    (events || []).forEach((e) => {
      const key = (e.source || "Other").trim();
      m.set(key, (m.get(key) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) =>
      b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]
    );
  }, [events]);

  // Apply tag filter
  const byTag = React.useMemo(() => {
    if (!filters.length) return events || [];
    return (events || []).filter((e) => (e.tags || []).some((t) => filters.includes(t)));
  }, [events, filters]);

  // Apply source filter
  const bySource = React.useMemo(() => {
    if (!sourceFilters.length) return byTag;
    return byTag.filter((e) => sourceFilters.includes((e.source || "Other").trim()));
  }, [byTag, sourceFilters]);

  // Hide RSVP'd events
  const visible = React.useMemo(() => {
    if (!myId) return bySource;
    return bySource.filter((e) => !((e.attendees || []) as string[]).includes(myId));
  }, [bySource, myId]);

  // Sources from the CURRENT visible feed (not all events)
  const visibleSources = React.useMemo(() => {
    const m = new Map<string, number>();
    (visible as EventUI[]).forEach((e) => {
      const key = (e.source || "Other").trim();
      m.set(key, (m.get(key) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) =>
      b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]
    );
  }, [visible]);

  // If a selected source no longer exists in the visible set, prune it
  React.useEffect(() => {
    setSourceFilters((prev) => prev.filter((s) => visibleSources.some(([src]) => src === s)));
  }, [visibleSources]);


  // Tags that exist in the CURRENT visible feed
  const visibleTags = React.useMemo(
    () =>
      Array.from(
        new Set(
          (visible as EventUI[]).flatMap((e) => (Array.isArray(e.tags) ? e.tags : []))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [visible]
  );

  // If a selected tag disappears from the visible set, prune it
  React.useEffect(() => {
    setFilters((prev) => prev.filter((t) => visibleTags.includes(t)));
  }, [visibleTags, setFilters]);

  return (
    <div className="space-y-4">
      <div className={cardBase}>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Event Central</div>
            <div className="text-xs text-neutral-500">
              {events.length} total • {visible.length} showing
              {filters.length ? ` • ${filters.length} tag${filters.length > 1 ? "s" : ""} applied` : ""}
              {sourceFilters.length ? ` • ${sourceFilters.length} source${sourceFilters.length > 1 ? "s" : ""} applied` : ""}
            </div>
          </div>
        </div>

        {/* Source filters (only when the visible feed has sources) */}
        {visibleSources.length > 0 && (
          <div className="mb-3">
            <div className="mb-1 text-[11px] font-medium text-neutral-600">Sources</div>
            <div className="flex flex-wrap gap-2">
              {visibleSources.map(([src, count]) => {
                const active = sourceFilters.includes(src);
                return (
                  <button
                    key={src}
                    className={cx(
                      chipBase,
                      active ? "border-indigo-500 bg-indigo-50" : "border-neutral-200 bg-white"
                    )}
                    onClick={() => toggleSource(src)}
                    title={`${count} event${count === 1 ? "" : "s"}`}
                  >
                    {src} <span className="ml-1 opacity-70">({count})</span>
                  </button>
                );
              })}
              {sourceFilters.length > 0 && (
                <button
                  className={cx(chipBase, "border-neutral-200 bg-white")}
                  onClick={() => setSourceFilters([])}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}


        {/* Tag filters (only when tags exist in the current feed) */}
        {visibleTags.length > 0 && (
          <div className="mb-3">
            <div className="mb-1 text-[11px] font-medium text-neutral-600">Tags</div>
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((t) => {
                const active = filters.includes(t);
                return (
                  <button
                    key={t}
                    className={cx(
                      chipBase,
                      active ? "border-indigo-500 bg-indigo-50" : "border-neutral-200 bg-white"
                    )}
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </button>
                );
              })}
              {filters.length > 0 && (
                <button
                  className={cx(chipBase, "border-neutral-200 bg-white")}
                  onClick={() => setFilters([])}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Event cards / empty state */}
        {visible.length === 0 ? (
          <div className={cx(cardBase, "mt-6")}>
            <div className="text-sm text-neutral-600">No new events nearby.</div>
          </div>
        ) : (
          <>
            {visible.map((e: EventUI) => (
              <div key={e.id} className={cardBase}>
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white text-xs font-bold">
                    <CalendarIcon className="h-4 w-4 opacity-90" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{e.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {e.time}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {e.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5" /> {e.source}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 pb-2.5">
                      {(e.tags || []).map((t) => (
                        <span key={t} className={cx(chipBase, "border-neutral-200 bg-white")}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-3">
                      {amGoing(e) ? (
                        <>
                          <button
                            className="flex-1 rounded-lg bg-neutral-200 text-neutral-700 px-4 py-2 text-sm font-medium cursor-default"
                            aria-disabled
                          >
                            Going
                          </button>
                          <button
                            className="flex-1 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                            onClick={() => onCancelRSVP(e.id)}
                          >
                            Cancel RSVP
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="flex-1 rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm font-medium"
                            onClick={() => onRSVP(e.id)}
                          >
                            I’m interested
                          </button>
                          <button
                            className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                            onClick={() => {/* optional info click */ }}
                          >
                            View Info
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </>
        )}
    </div>
  );
}


function ProfileScreen({ me, setMe, setOnboarded }: any) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(me);

  function save() {
    setMe(draft);
    setEditing(false);
  }

  return (
    <div className="space-y-4">
      <div className={cardBase}>
        <div className="flex items-start gap-3">
          <Avatar name={me.name || "You"} size={56} seed={5} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{me.name || "Student"}</div>
            <div className="text-xs text-neutral-600">{me.course} • {me.uni}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(me.goals || []).slice(0, 3).map((g: string) => (
                <span key={g} className={cx(chipBase, "border-neutral-200 bg-white")}>{g}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {!editing ? (
            <>
              <button className={cx(btnBase, "border bg-white")} onClick={() => setEditing(true)}>Edit</button>
              <button className={cx(btnBase, "bg-neutral-900 text-white")} onClick={() => setOnboarded(false)}>Re‑onboard</button>
            </>
          ) : (
            <>
              <button className={cx(btnBase, "border bg-white")} onClick={() => { setDraft(me); setEditing(false); }}>Cancel</button>
              <button className={cx(btnBase, "bg-indigo-600 text-white")} onClick={save}>Save</button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className={cardBase}>
          <div className="text-sm font-semibold">Edit Basics</div>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <TextInput label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
            <TextInput label="University" value={draft.uni} onChange={(v) => setDraft({ ...draft, uni: v })} />
            <TextInput label="Course" value={draft.course} onChange={(v) => setDraft({ ...draft, course: v })} />
            <ChipsInput label="Goals" value={draft.goals} onChange={(v) => setDraft({ ...draft, goals: v })} placeholder="e.g., Front‑end dev role" />
            <ChipsInput label="Interests" value={draft.interests} onChange={(v) => setDraft({ ...draft, interests: v })} placeholder="e.g., Cybersecurity, Basketball" />
            <ChipsInput label="Availability" value={draft.availability} onChange={(v) => setDraft({ ...draft, availability: v })} placeholder="e.g., Mon AM, Wed PM" />
            <div className="grid grid-cols-3 gap-2">
              <TextInput label="Style" value={draft.learning?.style || ""} onChange={(v) => setDraft({ ...draft, learning: { ...draft.learning, style: v } })} />
              <TextInput label="Group Size" value={draft.learning?.groupSize || ""} onChange={(v) => setDraft({ ...draft, learning: { ...draft.learning, groupSize: v } })} />
              <TextInput label="Frequency" value={draft.learning?.frequency || ""} onChange={(v) => setDraft({ ...draft, learning: { ...draft.learning, frequency: v } })} />
            </div>
          </div>
        </div>
      ) : (
        <div className={cardBase}>
          <div className="text-sm font-semibold">Preferences & Privacy</div>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <ToggleRow
              label="Broadcast social break (I'm free to hang)"
              value={me.socialBreak}
              onChange={(v) => setMe({ ...me, socialBreak: v })}
            />
            <ToggleRow
              label="Share location with matches"
              value={me.privacy?.showLocation}
              onChange={(v) => setMe({ ...me, privacy: { ...me.privacy, showLocation: v } })}
            />
            <ToggleRow
              label="Profile visible to matches only"
              value={me.privacy?.shareProfileWithMatchesOnly}
              onChange={(v) => setMe({ ...me, privacy: { ...me.privacy, shareProfileWithMatchesOnly: v } })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Onboarding
// -----------------------------------------------------------------------------
function Onboarding({ me, setMe, setOnboarded }: any) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOnboarded(true); // close modal
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOnboarded]);


  function isTextFilled(v?: string) {
    return typeof v === "string" && v.trim().length > 0;
  }
  function isListFilled(v?: string[]) {
    return Array.isArray(v) && v.length > 0;
  }

  const [draft, setDraft] = useState<User>(me);

  // Heuristic: if first/last name already exist, treat this pass as re-onboarding
  const isReOnboarding =
    Boolean(me?.firstName || me?.lastName || (me?.academicGoals?.length || 0) > 0);

  // ---- Full Onboarding ----
  const stepsFull = [
    {
      title: "Welcome to Nexa",
      content: (
        <p className="text-sm text-neutral-700">
          Let's set up your profile to find compatible study buddies and small groups. This takes about a minute.
        </p>
      ),
    },
    {
      title: "About You",
      content: (
        <div className="grid grid-cols-2 gap-2">
          <TextInput
            autoFocus
            label="First Name"
            value={draft.firstName || ""}
            onChange={(v: string) => setDraft({ ...draft, firstName: v })}
            placeholder="e.g., Alex"
          />
          <TextInput
            label="Last Name"
            value={draft.lastName || ""}
            onChange={(v: string) => setDraft({ ...draft, lastName: v })}
            placeholder="e.g., Nguyen"
          />
          <TextInput
            label="DOB (dd/MM/yyyy)"
            value={draft.dob || ""}
            onChange={(v: string) => setDraft({ ...draft, dob: v })}
            placeholder="31/12/2003"
          />
        </div>
      ),
    },
    {
      title: "Home",
      content: (
        <div className="grid grid-cols-2 gap-2">
          <TextInput
            label="Home Country"
            value={draft.homeCountry || ""}
            onChange={(v: string) => setDraft({ ...draft, homeCountry: v })}
            placeholder="e.g., Australia"
          />
          <TextInput
            label="Home Town"
            value={draft.homeTown || ""}
            onChange={(v: string) => setDraft({ ...draft, homeTown: v })}
            placeholder="e.g., Melbourne"
          />
        </div>
      ),
    },
    {
      title: "Education",
      content: (
        <div className="grid gap-3">
          <DropdownSelect
            label="University"
            options={UNI_OPTIONS}
            value={draft.uni}
            onChange={(v) => setDraft({ ...draft, uni: v })}
            placeholder="Search universities…"
          />
          <DropdownSelect
            label="Course"
            options={COURSE_OPTIONS}
            value={draft.course}
            onChange={(v) => setDraft({ ...draft, course: v })}
            placeholder="Search courses…"
          />
          <DropdownSelect
            label="Major"
            options={MAJOR_OPTIONS}
            value={draft.major || ""}
            onChange={(v) => setDraft({ ...draft, major: v })}
            placeholder="Search majors…"
          />
          <DropdownSelect
            label="Student Type"
            options={STUDENT_TYPE_OPTIONS}
            value={draft.studentType}
            onChange={(v) => setDraft({ ...draft, studentType: v as any })}
          />
        </div>

      ),
    },
    {
      title: "Academic Goals",
      content: (
        <DropdownMultiSelect
          label="Academic Goals"
          options={ACADEMIC_GOAL_OPTIONS}
          value={draft.academicGoals || []}
          onChange={(v) => setDraft({ ...draft, academicGoals: v })}
        />
      ),
    },
    {
      title: "Career Aspirations",
      content: (
        <DropdownMultiSelect
          label="Your career aspirations"
          options={CAREER_ASPIRATION_OPTIONS}
          value={draft.careerAspirations || []}
          onChange={(v) => setDraft({ ...draft, careerAspirations: v })}
        />
      ),
    },
    {
      title: "Hobbies",
      content: (
        <DropdownMultiSelect
          label="Hobbies"
          options={HOBBY_OPTIONS}
          value={draft.hobbies || []}
          onChange={(v) => setDraft({ ...draft, hobbies: v })}
          placeholder="Filter hobbies…"
        />
      ),
    },
    {
      title: "Study Availability",
      content: (
        <DropdownMultiSelect
          label="Study Availability"
          options={AVAILABILITY_OPTIONS}
          value={draft.availability || []}
          onChange={(v) => setDraft({ ...draft, availability: v })}
          placeholder="Filter times…"
        />
      ),
    },
    {
      title: "Preferred Study Style",
      content: (
        <div className="grid gap-3">
          <DropdownSelect
            label="Preferred Study Style"
            options={STUDY_STYLE_OPTIONS} // ["Solo","Pair","Group"]
            value={draft.learning?.style || ""}
            onChange={(v) => {
              // clear hidden fields when style changes
              const resets =
                v === "Solo" ? { groupSize: "", frequency: "" } :
                  v === "Pair" ? { groupSize: "" } :
                    {};
              setDraft({ ...draft, learning: { ...draft.learning, style: v, ...resets } });
            }}
          />

          {/* When Solo: show nothing else */}
          {draft.learning?.style !== "Solo" && (
            <>
              {/* When Pair: hide group size; When Group: show it */}
              {draft.learning?.style === "Group" && (
                <DropdownSelect
                  label="Preferred Group Size"
                  options={GROUP_SIZE_OPTIONS}
                  value={draft.learning?.groupSize || ""}
                  onChange={(v) =>
                    setDraft({ ...draft, learning: { ...draft.learning, groupSize: v } })
                  }
                />
              )}

              {/* Pair & Group both show Frequency */}
              <DropdownSelect
                label="Study Availability Frequency"
                options={FREQUENCY_OPTIONS}
                value={draft.learning?.frequency || ""}
                onChange={(v) =>
                  setDraft({ ...draft, learning: { ...draft.learning, frequency: v } })
                }
              />
            </>
          )}
        </div>
      ),
    },
  ];

  // ---- Re-Onboarding (quick update) ----
  const stepsRe = [
    {
      title: "Education",
      content: (
        <div className="grid gap-3">
          <DropdownSelect
            label="University"
            options={UNI_OPTIONS}
            value={draft.uni}
            onChange={(v) => setDraft({ ...draft, uni: v })}
            placeholder="Search universities…"
          />
          <DropdownSelect
            label="Course"
            options={COURSE_OPTIONS}
            value={draft.course}
            onChange={(v) => setDraft({ ...draft, course: v })}
            placeholder="Search courses…"
          />
          <DropdownSelect
            label="Major"
            options={MAJOR_OPTIONS}
            value={draft.major || ""}
            onChange={(v) => setDraft({ ...draft, major: v })}
            placeholder="Search majors…"
          />
          <DropdownSelect
            label="Student Type"
            options={STUDENT_TYPE_OPTIONS}
            value={draft.studentType}
            onChange={(v) => setDraft({ ...draft, studentType: v as any })}
          />
        </div>

      ),
    },
    {
      title: "Academic Goals",
      content: (
        <DropdownMultiSelect
          label="Academic Goals"
          options={ACADEMIC_GOAL_OPTIONS}
          value={draft.academicGoals || []}
          onChange={(v) => setDraft({ ...draft, academicGoals: v })}
        />
      ),
    },
    {
      title: "Career Aspirations",
      content: (
        <DropdownMultiSelect
          label="Your career aspirations"
          options={CAREER_ASPIRATION_OPTIONS}
          value={draft.careerAspirations || []}
          onChange={(v) => setDraft({ ...draft, careerAspirations: v })}
        />
      ),
    },
    {
      title: "Hobbies",
      content: (
        <DropdownMultiSelect
          label="Hobbies"
          options={HOBBY_OPTIONS}
          value={draft.hobbies || []}
          onChange={(v) => setDraft({ ...draft, hobbies: v })}
          placeholder="Filter hobbies…"
        />
      ),
    },
    {
      title: "Study Availability",
      content: (
        <DropdownMultiSelect
          label="Study Availability"
          options={AVAILABILITY_OPTIONS}
          value={draft.availability || []}
          onChange={(v) => setDraft({ ...draft, availability: v })}
          placeholder="Filter times…"
        />
      ),
    },
    {
      title: "Preferred Study Style",
      content: (
        <div className="grid gap-3">
          <DropdownSelect
            label="Preferred Study Style"
            options={STUDY_STYLE_OPTIONS} // ["Solo","Pair","Group"]
            value={draft.learning?.style || ""}
            onChange={(v) => {
              // clear hidden fields when style changes
              const resets =
                v === "Solo" ? { groupSize: "", frequency: "" } :
                  v === "Pair" ? { groupSize: "" } :
                    {};
              setDraft({ ...draft, learning: { ...draft.learning, style: v, ...resets } });
            }}
          />

          {/* When Solo: show nothing else */}
          {draft.learning?.style !== "Solo" && (
            <>
              {/* When Pair: hide group size; When Group: show it */}
              {draft.learning?.style === "Group" && (
                <DropdownSelect
                  label="Preferred Group Size"
                  options={GROUP_SIZE_OPTIONS}
                  value={draft.learning?.groupSize || ""}
                  onChange={(v) =>
                    setDraft({ ...draft, learning: { ...draft.learning, groupSize: v } })
                  }
                />
              )}

              {/* Pair & Group both show Frequency */}
              <DropdownSelect
                label="Study Availability Frequency"
                options={FREQUENCY_OPTIONS}
                value={draft.learning?.frequency || ""}
                onChange={(v) =>
                  setDraft({ ...draft, learning: { ...draft.learning, frequency: v } })
                }
              />
            </>
          )}
        </div>
      ),
    }
  ];

  const steps = isReOnboarding ? stepsRe : stepsFull;

  const isLast = step === steps.length - 1;

  function validateStep(stepTitle: string, d: User, reOnboarding: boolean): string | null {
    switch (stepTitle) {
      // Full onboarding only
      case "Welcome to Nexa":
        return null; // no inputs here

      case "About You":
        if (!isTextFilled(d.firstName)) return "Please enter your first name.";
        if (!isTextFilled(d.lastName)) return "Please enter your last name.";
        if (!isTextFilled(d.dob)) return "Please enter your date of birth (dd/MM/yyyy).";
        // Optional: format check (you already added this in next())
        return null;

      case "Home":
        if (!isTextFilled(d.homeCountry)) return "Please enter your home country.";
        if (!isTextFilled(d.homeTown)) return "Please enter your home town.";
        return null;

      // Shared (full + re-onboarding)
      case "Education":
        if (!isTextFilled(d.uni)) return "Please enter your university.";
        if (!isTextFilled(d.course)) return "Please enter your course.";
        if (!isTextFilled(d.major)) return "Please enter your major.";
        if (!isTextFilled(d.studentType)) return "Please specify if you are an International or Domestic student.";
        return null;

      case "Academic Goals":
        if (!isListFilled(d.academicGoals)) return "Please add at least one academic goal.";
        return null;

      case "Career Aspirations":
        if (!isListFilled(d.careerAspirations)) return "Please add at least one career aspiration.";
        return null;

      case "Hobbies":
        if (!isListFilled(d.hobbies)) return "Please add at least one hobby.";
        return null;

      case "Study Availability":
        if (!isListFilled(d.availability)) return "Please add at least one availability slot.";
        return null;

      case "Preferred Study Style":
        if (!isTextFilled(d.learning?.style))
          return "Please enter your preferred study style.";

        // Solo: nothing else required
        if (d.learning?.style === "Solo") return null;

        // Pair: frequency required, group size hidden
        if (d.learning?.style === "Pair") {
          if (!isTextFilled(d.learning?.frequency))
            return "Please enter your study frequency.";
          return null;
        }

        // Group: both group size and frequency required
        if (d.learning?.style === "Group") {
          if (!isTextFilled(d.learning?.groupSize))
            return "Please enter your preferred group size.";
          if (!isTextFilled(d.learning?.frequency))
            return "Please enter your study frequency.";
          return null;
        }
        return null;

      default:
        return null;
    }
  }


  function next() {
    // Validate required fields for this step
    const currentTitle = steps[step].title;
    const validationError = validateStep(currentTitle, draft, isReOnboarding);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Validate DOB if we're on the DOB step of full onboarding
    if (!isReOnboarding && steps[step].title === "About You" && draft.dob) {
      const ddmmyyyy = /^(0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[0-2])\/\d{4}$/;
      if (!ddmmyyyy.test(draft.dob)) {
        alert("Please enter DOB in the format dd/MM/yyyy");
        return; // stop progression
      }
    }
    if (isLast) {
      setMe(draft);
      setOnboarded(true);
    } else {
      setStep(step + 1);
    }
  }

  // Inline gating for the button state (visual UX)
  // Keep ddmmyyyy in sync with your next() guard
  const ddmmyyyy = /^(0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[0-2])\/\d{4}$/;

  const currentTitle = steps[step].title;
  // If it's the About You step in full onboarding, also check DOB format
  const dobFormatOk =
    isReOnboarding ||
    currentTitle !== "About You" ||
    (!draft.dob ? false : ddmmyyyy.test(draft.dob));

  // Use your validator to see if required fields are filled
  const pendingError = validateStep(currentTitle, draft, isReOnboarding);
  // Button can proceed only if there’s no validation error AND (if applicable) DOB format is OK
  const canProceed = !pendingError && dobFormatOk;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur overflow-y-auto overscroll-contain"
      onClick={() => setOnboarded(true)} // click outside to close
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-[100svh] items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{steps[step].title}</div>
              <div className="text-xs text-neutral-500">Step {step + 1} of {steps.length}</div>
            </div>
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div key={i} className={cx("h-2 w-2 rounded-full", i <= step ? "bg-indigo-600" : "bg-neutral-200")} />
              ))}
            </div>
          </div>

          <div className="mb-6 overflow-y-auto max-h-[60svh] pr-1">
            {steps[step].content}
          </div>

          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

          <div className="flex gap-3">
            {step > 0 && (
              <button
                className={cx(btnBase, "border bg-white")}
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            <button
              className={cx(
                btnBase,
                "flex-1",
                canProceed
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
              )}
              onClick={next}
              disabled={!canProceed}
            >
              {isLast ? "Complete Setup" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}