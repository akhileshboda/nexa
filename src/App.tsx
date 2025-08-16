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
} from "lucide-react";

import AuthScreen from "./components/AuthScreen";
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
  name: string;
  email?: string;
  password?: string;
  uni: string;
  course: string;
  year: number;
  from?: string;
  interests: string[];
  goals: string[];
  learning: {
    style: string;
    groupSize: string;
    frequency: string;
  };
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
  uni: "Monash University",
  course: "Bachelor of IT",
  year: 2,
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
  const [tab, setTab] = useState("home");
  const [me, setMe] = useState(() => storage.get("nexa_me", DEFAULT_USER));
  const [onboarded, setOnboarded] = useState(() => storage.get("nexa_onboarded", false));
  const [likes, setLikes] = useState(() => storage.get("nexa_likes", []));
  const [skips, setSkips] = useState(() => storage.get("nexa_skips", []));
  const [messages, setMessages] = useState(() => storage.get("nexa_msgs", SEEDED_MESSAGES));
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>([]); // event tags
  
  // Auth state
  const [authed, setAuthed] = useState(() => storage.get("nexa_authed", false));
  const [currentEmail, setCurrentEmail] = useState(() => storage.get("nexa_current_email", ""));

  useEffect(() => storage.set("nexa_authed", authed), [authed]);
  useEffect(() => storage.set("nexa_current_email", currentEmail), [currentEmail]);
  useEffect(() => storage.set("nexa_me", me), [me]);
  useEffect(() => storage.set("nexa_onboarded", onboarded), [onboarded]);
  useEffect(() => storage.set("nexa_likes", likes), [likes]);
  useEffect(() => storage.set("nexa_skips", skips), [skips]);
  useEffect(() => storage.set("nexa_msgs", messages), [messages]);

  // User registry management
  const getUsers = () => storage.get("nexa_users", []);
  const setUsers = (arr: any[]) => storage.set("nexa_users", arr);

  function handleSignIn(email: string, password: string) {
    const users = getUsers();
    const found = users.find((u: any) => 
      u.email.trim().toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (found) {
      setAuthed(true);
      setCurrentEmail(found.email);
      if (!me.name || me.name === "You") {
        setMe({ ...me, name: found.name || "Student" });
      }
      return true;
    }
    return false;
  }

  function handleRegister(name: string, email: string, password: string) {
    const users = getUsers();
    if (users.find((u: any) => u.email.trim().toLowerCase() === email.trim().toLowerCase())) {
      return false;
    }
    const newUsers = [...users, { name, email, password }];
    setUsers(newUsers);
    setAuthed(true);
    setCurrentEmail(email);
    setMe({ ...DEFAULT_USER, name: name || "Student" });
    setOnboarded(false); // trigger onboarding flow for new users
    return true;
  }

  function handleLogout() {
    setAuthed(false);
    setCurrentEmail("");
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

  function sendMessage(userId: string, text: string) {
    if (!text.trim()) return;
    setMessages((prev) => ({
      ...prev,
      [userId]: [...(prev[userId] || []), { from: "me", text }],
    }));
  }

  function resetDemo() {
    storage.del("nexa_me");
    storage.del("nexa_onboarded");
    storage.del("nexa_likes");
    storage.del("nexa_skips");
    storage.del("nexa_msgs");
    setMe(DEFAULT_USER);
    setOnboarded(false);
    setLikes([]);
    setSkips([]);
    setMessages(SEEDED_MESSAGES);
    setCurrentChat(null);
    setTab("home");
  }

  // Show auth screen if not authenticated
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
            <MessagesScreen
              pool={pool}
              messages={messages}
              setMessages={setMessages}
              currentChat={currentChat}
              setCurrentChat={setCurrentChat}
              onSend={sendMessage}
            />
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

function MessagesScreen({ pool, messages, setMessages, currentChat, setCurrentChat, onSend }: any) {
  const peers = pool.filter((p: any) => messages[p.id]);
  const active = pool.find((p: any) => p.id === currentChat) || peers[0];
  useEffect(() => {
    if (!currentChat && active) setCurrentChat(active.id);
  }, [active, currentChat, setCurrentChat]);

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Conversations */}
      <div className={cardBase}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Conversations</div>
          <button className={cx(btnBase, "border bg-white text-xs")}
            onClick={() => alert("In a full build, you could start a new chat from a liked profile.")}
          >
            <Plus className="mr-1 h-3.5 w-3.5"/> New
          </button>
        </div>
        {peers.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {peers.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setCurrentChat(p.id)}
                className={cx(
                  "flex min-w-[140px] items-center gap-2 rounded-xl border px-3 py-2",
                  currentChat === p.id ? "border-indigo-500 bg-indigo-50" : "bg-white"
                )}
              >
                <Avatar name={p.name} size={32} seed={p.seed} />
                <div className="min-w-0 text-left">
                  <div className="truncate text-xs font-medium">{p.name}</div>
                  <div className="truncate text-[11px] text-neutral-600">{p.course}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-neutral-600">No conversations yet. Like a profile to get started.</div>
        )}
      </div>

      {/* Active chat */}
      {active && (
        <ChatBox key={active.id} peer={active} msgs={messages[active.id] || []} onSend={(t: string) => onSend(active.id, t)} />
      )}
    </div>
  );
}

function ChatBox({ peer, msgs, onSend }: any) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  return (
    <div className={cardBase}>
      <div className="mb-2 flex items-center gap-2">
        <Avatar name={peer.name} size={36} seed={peer.seed} />
        <div>
          <div className="text-sm font-semibold">{peer.name}</div>
          <div className="text-xs text-neutral-600">{peer.course} • {peer.uni}</div>
        </div>
      </div>
      <div className="h-64 overflow-y-auto rounded-xl border bg-white p-3">
        {msgs.map((m: Message, i: number) => (
          <div key={i} className={cx("mb-2 flex", m.from === "me" ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[75%] rounded-2xl px-3 py-2 text-sm", m.from === "me" ? "bg-neutral-900 text-white" : "bg-neutral-100")}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSend(text);
          setText("");
        }}
      >
        <input
          className="flex-1 rounded-2xl border px-3 py-2 text-sm outline-none focus:border-neutral-400"
          placeholder="Write a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className={cx(btnBase, "bg-indigo-600 text-white")}>
          <Send className="h-4 w-4" />
        </button>
      </form>
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
  const [draft, setDraft] = useState(me);

  const steps = [
    {
      title: "Welcome to Nexa",
      content: (
        <p className="text-sm text-neutral-700">
          Let's set up your profile to find compatible study buddies and small groups. This takes about a minute.
        </p>
      ),
    },
    {
      title: "Your Goals",
      content: (
        <ChipsInput
          autoFocus
          label="What are you seeking from this app?"
          value={draft.goals}
          onChange={(v) => setDraft({ ...draft, goals: v })}
          placeholder="e.g., Study partner, Front‑end pathway, Cyber labs"
        />
      ),
    },
    {
      title: "Interests",
      content: (
        <ChipsInput
          label="Academic & personal interests"
          value={draft.interests}
          onChange={(v) => setDraft({ ...draft, interests: v })}
          placeholder="e.g., React, Cybersecurity, Basketball, Bubble tea"
        />
      ),
    },
    {
      title: "Study Preferences",
      content: (
        <div className="grid grid-cols-3 gap-2">
          <TextInput label="Style" value={draft.learning?.style || ""} onChange={(v) => setDraft({ ...draft, learning: { ...draft.learning, style: v } })} />
          <TextInput label="Group size" value={draft.learning?.groupSize || ""} onChange={(v) => setDraft({ ...draft, learning: { ...draft.learning, groupSize: v } })} />
          <TextInput label="Frequency" value={draft.learning?.frequency || ""} onChange={(v) => setDraft({ ...draft, learning: { ...draft.learning, frequency: v } })} />
        </div>
      ),
    },
    {
      title: "Availability",
      content: (
        <ChipsInput
          label="When are you generally available to study?"
          value={draft.availability}
          onChange={(v) => setDraft({ ...draft, availability: v })}
          placeholder="e.g., Mon AM, Tue PM, Weekend"
        />
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  function next() {
    if (isLast) {
      setMe(draft);
      setOnboarded(true);
    } else {
      setStep(step + 1);
    }
  }

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

          <div className="flex gap-3">
            {step > 0 && (
              <button className={cx(btnBase, "border bg-white")} onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button className={cx(btnBase, "flex-1 bg-indigo-600 text-white")} onClick={next}>
              {isLast ? "Complete Setup" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}