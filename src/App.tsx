import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Home as HomeIcon,
  PersonStanding,
  MessagesSquare,
  Calendar as CalendarIcon,
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
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";

import { useAuth } from "./hooks/useAuth";
import { db } from "./lib/supabase";
import MessagesScreen from "./components/MessagesScreen";
import Avatar from "./components/Avatar";
import { btnBase, cardBase, chipBase, cx, TextInput, ChipsInput, ToggleRow } from "./components/UI";
import logo from "./assets/logo.png";

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

interface Event {
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

const SAMPLE_EVENTS: Event[] = [
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

// Simple rule‑based score for demo purposes
function scoreMatch(me: User, other: User) {
  let s = 0;
  if (!me || !other) return 0;
  if (me.course && other.course && me.course.split(" ")[0] === other.course.split(" ")[0]) s += 2;
  if (me.uni && other.uni && me.uni === other.uni) s += 2;
  const commonInterests = (me.interests || []).filter((i) => other.interests.includes(i));
  s += commonInterests.length * 1.5;
  const goalOverlap = (me.goals || []).filter((g) => other.goals.includes(g)).length;
  s += goalOverlap * 1.5;
  const availOverlap = (me.availability || []).filter((a) => other.availability.includes(a)).length;
  s += availOverlap * 1.25;
  return Math.round(s * 10) / 10;
}

// -----------------------------------------------------------------------------
// Main App
// -----------------------------------------------------------------------------
export default function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const [tab, setTab] = useState("home");
  const [me, setMe] = useState(() => storage.get("nexa_me", DEFAULT_USER));
  const [onboarded, setOnboarded] = useState(() => storage.get("nexa_onboarded", false));
  const [likes, setLikes] = useState(() => storage.get("nexa_likes", []));
  const [skips, setSkips] = useState(() => storage.get("nexa_skips", []));
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>([]); // event tags

  useEffect(() => storage.set("nexa_me", me), [me]);
  useEffect(() => storage.set("nexa_onboarded", onboarded), [onboarded]);
  useEffect(() => storage.set("nexa_likes", likes), [likes]);
  useEffect(() => storage.set("nexa_skips", skips), [skips]);

  // Sync profile with Supabase when user signs in
  useEffect(() => {
    if (user && user.id) {
      // Load or create profile
      db.getProfile(user.id).then(profile => {
        if (profile) {
          setMe(prev => ({
            ...prev,
            id: user.id,
            name: profile.name || user.user_metadata?.name || "Student",
            uni: profile.uni || prev.uni,
            course: profile.course || prev.course,
            year: profile.year || prev.year,
            interests: profile.interests || prev.interests,
            goals: profile.goals || prev.goals,
            availability: profile.availability || prev.availability,
            learning: {
              style: profile.learning_style || prev.learning?.style || "",
              groupSize: profile.group_size || prev.learning?.groupSize || "",
              frequency: profile.frequency || prev.learning?.frequency || ""
            }
          }));
        } else {
          // Create new profile
          const newProfile = {
            id: user.id,
            name: user.user_metadata?.name || "Student",
            uni: me.uni || "Monash University",
            course: me.course || "Bachelor of IT",
            year: me.year || 2,
            interests: me.interests || [],
            goals: me.goals || [],
            learning_style: me.learning?.style || "",
            group_size: me.learning?.groupSize || "",
            frequency: me.learning?.frequency || "",
            availability: me.availability || []
          };
          db.upsertProfile(newProfile);
          setMe(prev => ({ ...prev, id: user.id, name: newProfile.name }));
        }
      });
    }
  }, [user]);

  // Update profile in Supabase when local state changes
  useEffect(() => {
    if (user && user.id && me.id === user.id) {
      const profileUpdate = {
        id: user.id,
        name: me.name,
        uni: me.uni,
        course: me.course,
        year: me.year,
        interests: me.interests,
        goals: me.goals,
        learning_style: me.learning?.style || "",
        group_size: me.learning?.groupSize || "",
        frequency: me.learning?.frequency || "",
        availability: me.availability
      };
      db.upsertProfile(profileUpdate);
    }
  }, [me, user]);

  async function handleSignIn(email: string, password: string) {
    const { error } = await signIn(email, password);
    return !error;
  }

  async function handleRegister(name: string, email: string, password: string) {
    const { error } = await signUp(email, password, name);
    if (!error) {
      setOnboarded(false); // trigger onboarding for new users
      return true;
    }
    return false;
  }

  async function handleLogout() {
    await signOut();
    resetDemo();
  }

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
    setCurrentChat(null);
    setTab("home");
  }

  // Show loading or auth screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreenWithSupabase onSignIn={handleSignIn} onRegister={handleRegister} />;
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
            <MessagesScreen currentUserId={user.id} />
          )}
          {tab === "events" && (
            <EventsScreen
              pool={pool}
              events={SAMPLE_EVENTS}
              filters={filters}
              setFilters={setFilters}
              me={me}
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
                    "Hey, {topCandidate.profile.name} looks like a strong fit (score {topCandidate.score}). Want to start a chat?"
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
        <div className="grid grid-cols-2 gap-3">
          <div className={cardBase}>
            <div className="text-xs text-neutral-500">Connections</div>
            <div className="mt-1 text-2xl font-semibold">{likes.length}</div>
            <div className="mt-2 text-xs text-neutral-500">Liked profiles</div>
          </div>
          <div className={cardBase}>
            <div className="text-xs text-neutral-500">Next Best Match</div>
            <div className="mt-1 text-2xl font-semibold">{topCandidate ? topCandidate.score : "—"}</div>
            <div className="mt-2 text-xs text-neutral-500">Rule‑based score</div>
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
        <div className="absolute -bottom-7 left-4">
          <Avatar name={me.name || "You"} size={64} seed={5} />
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
            <ProfileCard profile={candidate.profile} score={candidate.score} />
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
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4"/> Suggested Study Group</div>
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

function ProfileCard({ profile, score }: any) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar name={profile.name} size={56} seed={profile.seed} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="truncate text-sm font-semibold">{profile.name}</div>
            <span className="text-xs font-semibold text-indigo-600">Score {score}</span>
          </div>
          <div className="mt-0.5 text-xs text-neutral-600">
            <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5"/> {profile.course}</span>
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
            <MapPin className="h-3.5 w-3.5"/>
            {profile.from} • {profile.uni}
            <span className="mx-1">•</span>
            <Clock className="h-3.5 w-3.5"/>
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


function EventsScreen({ pool, events, filters, setFilters, me }: any) {
  const toggleTag = (t: string) =>
    setFilters((prev: string[]) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const allTags = Array.from(new Set(events.flatMap((e: Event) => e.tags)));
  const visible = events.filter((e: Event) => (filters.length ? e.tags.some((t) => filters.includes(t)) : true));

  return (
    <div className="space-y-4">
      <div className={cardBase}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Event Central</div>
          <button className={cx(btnBase, "border bg-white text-xs")} onClick={() => alert("Opens external event source; we aggregate only.")}>
            <Filter className="mr-1 h-3.5 w-3.5"/> Sources
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.map((t: string) => (
            <button
              key={t}
              className={cx(chipBase, filters.includes(t) ? "border-indigo-500 bg-indigo-50" : "border-neutral-200 bg-white")}
              onClick={() => toggleTag(t)}
            >
              {t}
            </button>
          ))}
          {filters.length > 0 && (
            <button className={cx(chipBase, "border-neutral-200 bg-white")} onClick={() => setFilters([])}>Clear</button>
          )}
        </div>
      </div>

      {visible.map((e: Event) => (
        <div key={e.id} className={cardBase}>
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white text-xs font-bold">
              {e.time.split(",")[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{e.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5"/> {e.time}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/> {e.location}</span>
                <span className="inline-flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5"/> {e.source}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {e.tags.map((t: string) => (
                  <span key={t} className={cx(chipBase, "border-neutral-200 bg-white")}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-xs text-neutral-600">
                {e.attendees.length ? (
                  <>Friends going: {e.attendees.map((id: string) => pool.find((p: any) => p.id === id)?.name).filter(Boolean).join(", ")}</>
                ) : (
                  <>No friends going yet. Be the first!</>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button className={cx(btnBase, "border bg-white")}>Open Source</button>
                <button className={cx(btnBase, "bg-neutral-900 text-white")} onClick={() => alert("In a full build, this RSVPs and shares to your group.")}>I'm interested</button>
              </div>
            </div>
          </div>
        </div>
      ))}
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
      <div className="grid grid-cols-2 gap-2">
        <TextInput
          label="University"
          value={draft.uni || ""}
          onChange={(v: string) => setDraft({ ...draft, uni: v })}
          placeholder="e.g., Monash University"
        />
        <TextInput
          label="Course"
          value={draft.course || ""}
          onChange={(v: string) => setDraft({ ...draft, course: v })}
          placeholder="e.g., Bachelor of IT"
        />
        <TextInput
          label="Major"
          value={draft.major || ""}
          onChange={(v: string) => setDraft({ ...draft, major: v })}
          placeholder="e.g., Cybersecurity / Data Science"
        />
        <TextInput
          label="Student Type"
          value={draft.studentType || ""}
          onChange={(v: string) =>
            setDraft({ ...draft, studentType: (v === "International" || v === "Domestic") ? v as any : v as any })
          }
          placeholder="International / Domestic"
        />
      </div>
    ),
  },
  {
    title: "Academic Goals",
    content: (
      <ChipsInput
        autoFocus
        label="What are your academic goals?"
        value={draft.academicGoals || []}
        onChange={(v: string[]) => setDraft({ ...draft, academicGoals: v })}
        placeholder="e.g., HD average, publish paper, exchange program"
      />
    ),
  },
  {
    title: "Career Aspirations",
    content: (
      <ChipsInput
        label="Your career aspirations"
        value={draft.careerAspirations || []}
        onChange={(v: string[]) => setDraft({ ...draft, careerAspirations: v })}
        placeholder="e.g., Cyber analyst, Front-end dev, Product manager"
      />
    ),
  },
  {
    title: "Hobbies",
    content: (
      <ChipsInput
        label="What do you enjoy?"
        value={draft.hobbies || []}
        onChange={(v: string[]) => setDraft({ ...draft, hobbies: v })}
        placeholder="e.g., Basketball, Lifting, Photography, Cooking"
      />
    ),
  },
  {
    title: "Study Availability",
    content: (
      <ChipsInput
        label="When are you generally available to study?"
        value={draft.availability || []}
        onChange={(v: string[]) => setDraft({ ...draft, availability: v })}
        placeholder="e.g., Mon AM, Tue PM, Weekend"
      />
    ),
  },
  {
    title: "Preferred Study Style",
    content: (
      <div className="grid grid-cols-3 gap-2">
        <TextInput
          label="Style"
          value={draft.learning?.style || ""}
          onChange={(v: string) => setDraft({ ...draft, learning: { ...draft.learning, style: v } })}
          placeholder="Solo / Group / Pair"
        />
        <TextInput
          label="Group size"
          value={draft.learning?.groupSize || ""}
          onChange={(v: string) => setDraft({ ...draft, learning: { ...draft.learning, groupSize: v } })}
          placeholder="2 / 3–4 / 5+"
        />
        <TextInput
          label="Frequency"
          value={draft.learning?.frequency || ""}
          onChange={(v: string) => setDraft({ ...draft, learning: { ...draft.learning, frequency: v } })}
          placeholder="e.g., 2× per week"
        />
      </div>
    ),
  },
];

// ---- Re-Onboarding (quick update) ----
const stepsRe = [
  {
    title: "Education",
    content: (
      <div className="grid grid-cols-2 gap-2">
        <TextInput
          autoFocus
          label="University"
          value={draft.uni || ""}
          onChange={(v: string) => setDraft({ ...draft, uni: v })}
        />
        <TextInput
          label="Course"
          value={draft.course || ""}
          onChange={(v: string) => setDraft({ ...draft, course: v })}
        />  
        <TextInput
          label="Major"
          value={draft.major || ""}
          onChange={(v: string) => setDraft({ ...draft, major: v })}
          placeholder="e.g., Cybersecurity / Data Science"
        />
        <TextInput
          label="Student Type"
          value={draft.studentType || ""}
          onChange={(v: string) =>
            setDraft({ ...draft, studentType: (v === "International" || v === "Domestic") ? v as any : v as any })
          }
          placeholder="International / Domestic"
        />
      </div>
    ),
  },
  {
    title: "Academic Goals",
    content: (
      <ChipsInput
        label="What are your academic goals?"
        value={draft.academicGoals || []}
        onChange={(v: string[]) => setDraft({ ...draft, academicGoals: v })}
      />
    ),
  },
  {
    title: "Career Aspirations",
    content: (
      <ChipsInput
        label="Your career aspirations"
        value={draft.careerAspirations || []}
        onChange={(v: string[]) => setDraft({ ...draft, careerAspirations: v })}
      />
    ),
  },
  {
    title: "Hobbies",
    content: (
      <ChipsInput
        label="Hobbies"
        value={draft.hobbies || []}
        onChange={(v: string[]) => setDraft({ ...draft, hobbies: v })}
      />
    ),
  },
  {
    title: "Study Availability",
    content: (
      <ChipsInput
        label="When are you generally available to study?"
        value={draft.availability || []}
        onChange={(v: string[]) => setDraft({ ...draft, availability: v })}
      />
    ),
  },
  {
    title: "Preferred Study Style",
    content: (
      <div className="grid grid-cols-3 gap-2">
        <TextInput
          label="Style"
          value={draft.learning?.style || ""}
          onChange={(v: string) => setDraft({ ...draft, learning: { ...draft.learning, style: v } })}
        />
        <TextInput
          label="Group size"
          value={draft.learning?.groupSize || ""}
          onChange={(v: string) => setDraft({ ...draft, learning: { ...draft.learning, groupSize: v } })}
        />
        <TextInput
          label="Frequency"
          value={draft.learning?.frequency || ""}
          onChange={(v: string) => setDraft({ ...draft, learning: { ...draft.learning, frequency: v } })}
        />
      </div>
    ),
  },
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
      if (!isTextFilled(d.learning?.style)) return "Please enter your preferred study style.";
      if (!isTextFilled(d.learning?.groupSize)) return "Please enter your preferred group size.";
      if (!isTextFilled(d.learning?.frequency)) return "Please enter your study frequency.";
      return null;

    default:
      return null;
  }
}

// Auth screen wrapper component
function AuthScreenWithSupabase({ onSignIn, onRegister }: any) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'register') {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      if (mode === 'login') {
        const success = await onSignIn(formData.email, formData.password);
        if (!success) {
          setErrors({ form: 'Invalid email or password' });
        }
      } else {
        const success = await onRegister(formData.name, formData.email, formData.password);
        if (!success) {
          setErrors({ form: 'Registration failed. Please try again.' });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Nexa Logo" className="h-52 w-52 rounded-xl" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Welcome</h1>
          <p className="text-neutral-600 text-sm">
            {mode === 'login' 
              ? 'Sign in to continue your study journey' 
              : 'Create your account to get started'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white/80 backdrop-blur border rounded-3xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  className={cx("w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100", errors.name && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                className={cx("w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100", errors.email && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={cx("w-full rounded-2xl border border-neutral-200 px-4 py-3 pr-12 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100", errors.password && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password field (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  className={cx("w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100", errors.confirmPassword && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Form-level error */}
            {errors.form && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                <p className="text-red-600 text-sm">{errors.form}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={cx(btnBase, "w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed")}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </div>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={switchMode}
                className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        {/* Demo Info */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2 text-xs text-blue-800">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            Connected to Supabase - Real database
          </div>
        </div>
      </div>
    </div>
  );
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur">
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-6">
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

          <div className="mb-6">{steps[step].content}</div>

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