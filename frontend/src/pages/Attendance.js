import { useEffect, useState } from "react";
import { ClipboardCheck, ChevronLeft, ChevronDown, ChevronRight,
         UserPlus, X, MapPin, Calendar, Check, Clock,
         History, CalendarDays } from "lucide-react";
import { getKids, markAttendance, getSessionAttendance } from "../api";
import { useAuth } from "../context/AuthContext";
import { pageWrapper, card, input, btnPrimary, btnOutline } from "../components/UI";
import StudentFilter from "../components/StudentFilter";
import axios from "axios";

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api" });
api.interceptors.request.use(c => {
  const u = JSON.parse(localStorage.getItem("user"));
  if (u?.access_token) c.headers.Authorization = `Bearer ${u.access_token}`;
  return c;
});

const getThisWeek    = ()  => api.get("/sessions/this-week");
const generateWeek   = ()  => api.post("/sessions/generate-week");
const getHistory     = ()  => api.get("/sessions/history");

const STATUS_STYLE = {
  present: { backgroundColor: "rgba(0,229,204,0.1)",  color: "#00E5CC" },
  absent:  { backgroundColor: "rgba(239,68,68,0.1)",  color: "#F87171" },
};

const STATUS_ICON = {
  present: <Check size={12} />,
  absent:  <X size={12} />,
};

function formatDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatMonth(m) {
  const [y, mo] = m.split("-");
  return new Date(y, mo - 1).toLocaleString("default", { month: "long", year: "numeric" });
}

function getWeekLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const mon = new Date(d);
  mon.setDate(d.getDate() - d.getDay() + 1);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (dt) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Week of ${fmt(mon)} – ${fmt(sun)}`;
}

// ── Session card (used in both this-week and history) ──────────────────────
function SessionCard({ s, onClick, compact = false }) {
  const enrolled = s.session_templates?.session_enrollments?.length
    ?? s.session_templates?.session_enrollments?.length ?? 0;
  const counts   = s.attendance_counts;
  const completed = s.status === "completed";

  return (
    <div onClick={onClick}
      style={{ ...card, cursor: "pointer" }}
      className={`rounded-xl ${compact ? "p-3" : "p-4"} hover:border-cyan-500/30 transition-all group`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
            className="px-2 py-0.5 rounded-full text-xs font-bold">{s.age_group}</span>
          <span style={completed
              ? { backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }
              : { backgroundColor: "rgba(251,191,36,0.1)", color: "#FCD34D" }}
            className="text-xs px-2 py-0.5 rounded-full capitalize">{s.status}</span>
        </div>
        <ChevronRight size={14} className="text-gray-600 group-hover:text-cyan-500 transition-colors flex-shrink-0 mt-0.5" />
      </div>

      <p className="text-white font-semibold text-sm mb-0.5">{formatDay(s.date)}</p>
      <p className="text-gray-500 text-xs">{s.start_time} – {s.end_time}</p>
      {s.coaches?.name && <p className="text-gray-500 text-xs mt-0.5">{s.coaches.name}</p>}

      {/* Attendance counts if completed */}
      {completed && counts && (
        <div className="flex gap-2 mt-2">
          {[
            { k: "present", color: "#00E5CC", bg: "rgba(0,229,204,0.08)" },
            { k: "absent",  color: "#F87171", bg: "rgba(239,68,68,0.08)" },
          ].map(({ k, color, bg }) => counts[k] > 0 && (
            <span key={k} style={{ backgroundColor: bg, color }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold">
              {STATUS_ICON[k]} {counts[k]}
            </span>
          ))}
        </div>
      )}

      {!completed && (
        <p className="text-gray-600 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-all">
          Mark attendance →
        </p>
      )}
    </div>
  );
}

// ── History view ───────────────────────────────────────────────────────────
function HistoryView({ onSelectSession }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openLocation, setOpenLocation] = useState(null);
  const [openMonth, setOpenMonth] = useState({});   // locId → month string

  useEffect(() => {
    getHistory().then(r => {
      setHistory(r.data);
      // Auto-open first location
      if (r.data.length > 0) setOpenLocation(r.data[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleMonth = (locId, month) => {
    setOpenMonth(m => ({ ...m, [`${locId}_${month}`]: !m[`${locId}_${month}`] }));
  };

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-500 text-sm p-8">
      <div style={{ borderColor: "#00E5CC" }} className="animate-spin rounded-full h-4 w-4 border-b-2" />
      Loading history…
    </div>
  );

  if (history.length === 0) return (
    <div style={card} className="rounded-2xl p-12 text-center">
      <History size={32} className="mx-auto mb-3 text-gray-600" />
      <p className="text-gray-500 text-sm">No session history yet.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {history.map(loc => {
        const isLocOpen = openLocation === loc.id;
        const totalSessions = loc.months?.reduce((sum, m) => sum + m.sessions.length, 0) || 0;
        const completedSessions = loc.months?.reduce((sum, m) =>
          sum + m.sessions.filter(s => s.status === "completed").length, 0) || 0;

        return (
          <div key={loc.id} style={card} className="rounded-2xl overflow-hidden">
            {/* Location header */}
            <div
              onClick={() => setOpenLocation(isLocOpen ? null : loc.id)}
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/2 transition-colors"
            >
              <div style={{ backgroundColor: "rgba(0,229,204,0.12)", color: "#00E5CC" }}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin size={18} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{loc.name}</p>
                {loc.address && <p className="text-gray-500 text-xs mt-0.5">{loc.address}</p>}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p style={{ color: "#00E5CC" }} className="text-sm font-bold">{completedSessions}</p>
                  <p className="text-gray-600 text-xs">completed</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-white text-sm font-bold">{totalSessions}</p>
                  <p className="text-gray-600 text-xs">total</p>
                </div>
                <ChevronDown size={16} className="text-gray-500 transition-transform"
                  style={{ transform: isLocOpen ? "rotate(180deg)" : "none" }} />
              </div>
            </div>

            {/* Months accordion */}
            {isLocOpen && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {loc.months?.map(({ month, sessions }) => {
                  const monthKey = `${loc.id}_${month}`;
                  const isMonthOpen = openMonth[monthKey];
                  const monthCompleted = sessions.filter(s => s.status === "completed").length;

                  // Group sessions by week
                  const byWeek = {};
                  sessions.forEach(s => {
                    const d = new Date(s.date + "T00:00:00");
                    const mon = new Date(d);
                    mon.setDate(d.getDate() - d.getDay() + 1);
                    const wk = mon.toISOString().slice(0, 10);
                    if (!byWeek[wk]) byWeek[wk] = [];
                    byWeek[wk].push(s);
                  });

                  return (
                    <div key={month} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      {/* Month row */}
                      <div
                        onClick={() => toggleMonth(loc.id, month)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/2 transition-colors"
                      >
                        <Calendar size={14} className="text-gray-500 flex-shrink-0" />
                        <p className="text-gray-300 font-medium text-sm flex-1">{formatMonth(month)}</p>
                        <div className="flex items-center gap-3">
                          <span style={{ backgroundColor: "rgba(0,229,204,0.08)", color: "#00E5CC" }}
                            className="text-xs px-2 py-0.5 rounded-full font-semibold">
                            {monthCompleted}/{sessions.length} done
                          </span>
                          <ChevronDown size={13} className="text-gray-600 transition-transform"
                            style={{ transform: isMonthOpen ? "rotate(180deg)" : "none" }} />
                        </div>
                      </div>

                      {/* Weeks inside month */}
                      {isMonthOpen && (
                        <div className="px-4 pb-4 space-y-4"
                          style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                          {Object.entries(byWeek)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([weekStart, weekSessions]) => (
                              <div key={weekStart}>
                                <p className="text-gray-600 text-xs font-medium mb-2 pt-3">
                                  {getWeekLabel(weekSessions[0].date)}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {weekSessions
                                    .sort((a, b) => a.date.localeCompare(b.date))
                                    .map(s => (
                                      <SessionCard key={s.id} s={s} compact
                                        onClick={() => onSelectSession(s)} />
                                    ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Attendance() {
  const { user } = useAuth();
  const [mode, setMode] = useState("week");   // "week" | "history"
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [walkIns, setWalkIns] = useState([]);
  const [allKids, setAllKids] = useState([]);
  const [walkInSearch, setWalkInSearch] = useState("");
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [locations, setLocations] = useState([]);
  const [walkInAge, setWalkInAge] = useState("");
  const [walkInLocation, setWalkInLocation] = useState("");

  const isCoach = user?.role === "coach";

  const loadSessions = async () => {
    setLoading(true);
    try {
      await generateWeek();
      const res = await getThisWeek();
      let data = res.data;
      if (isCoach && user?.coach?.id) {
        data = data.filter(s => s.coach_id === user.coach.id);
      }
      data.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
      setSessions(data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
    getKids().then(r => setAllKids(r.data));
    api.get("/locations").then(r => setLocations(r.data)).catch(() => {});
  }, []);

  const handleSessionSelect = async (session) => {
    setSelectedSession(session);
    setWalkIns([]);
    setShowWalkIn(false);
    setDone(false);

    const enrolled = session.session_templates?.session_enrollments?.map(e => e.kids).filter(Boolean) || [];
    const existing = await getSessionAttendance(session.id);
    const existingMap = {};
    existing.data.forEach(r => { existingMap[r.kid_id] = r.status; });

    const init = {};
    enrolled.forEach(k => { init[k.id] = existingMap[k.id] || "present"; });

    const enrolledIds = new Set(enrolled.map(k => k.id));
    const existingWalkIns = existing.data
      .filter(r => !enrolledIds.has(r.kid_id))
      .map(r => ({ kid_id: r.kid_id, status: r.status, kid: allKids.find(k => k.id === r.kid_id) }));

    setAttendance(init);
    setWalkIns(existingWalkIns);
    if (session.status === "completed") setDone(true);
  };

  const addWalkIn = (kid) => {
    if (attendance[kid.id] !== undefined || walkIns.find(w => w.kid_id === kid.id)) return;
    setWalkIns(w => [...w, { kid_id: kid.id, status: "present", kid }]);
    setWalkInSearch("");
    setShowWalkIn(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const records = [
      ...Object.entries(attendance).map(([kid_id, status]) => ({ kid_id, status })),
      ...walkIns.map(w => ({ kid_id: w.kid_id, status: w.status })),
    ];
    await markAttendance({ session_id: selectedSession.id, records });
    setDone(true);
    setSubmitting(false);
    loadSessions();
  };

  const enrolledKids = selectedSession
    ? (selectedSession.session_templates?.session_enrollments?.map(e => e.kids).filter(Boolean) || [])
    : [];

    const present = Object.values(attendance).filter(v => v === "present").length + walkIns.filter(w => w.status === "present").length;
    const absent  = Object.values(attendance).filter(v => v === "absent").length  + walkIns.filter(w => w.status === "absent").length;
  const walkInSuggestions = walkInSearch.length > 1
    ? allKids.filter(k =>
        k.name.toLowerCase().includes(walkInSearch.toLowerCase()) &&
        attendance[k.id] === undefined &&
        !walkIns.find(w => w.kid_id === k.id) &&
        (!walkInAge || k.age_group === walkInAge)
      )
    : [];

  // ── Attendance marking view ──────────────────────────────────────────────
  if (selectedSession) {
    const locName = selectedSession.locations?.name;
    return (
      <div style={pageWrapper} className="p-4 sm:p-6 lg:p-8">
        <div style={card} className="rounded-2xl overflow-hidden">
          {/* Header */}
          <div style={{ backgroundColor: "#080F1E", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            className="p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                {locName && (
                  <span className="flex items-center gap-1 text-gray-500 text-xs">
                    <MapPin size={11} /> {locName}
                  </span>
                )}
                <span style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
                  className="text-xs px-2 py-0.5 rounded-full font-semibold">{selectedSession.age_group}</span>
              </div>
              <h2 className="font-bold text-white">{formatDay(selectedSession.date)}</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {selectedSession.start_time} – {selectedSession.end_time}
                {selectedSession.coaches?.name && ` · ${selectedSession.coaches.name}`}
              </p>
            </div>
            <button onClick={() => setSelectedSession(null)} style={btnOutline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all flex-shrink-0">
              <ChevronLeft size={14} /> Back
            </button>
          </div>

          {/* Summary pills */}
          <div className="p-4 flex gap-2 flex-wrap" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {[
              { label: "Present", count: present, color: "#00E5CC", bg: "rgba(0,229,204,0.1)", icon: <Check size={12} /> },
              { label: "Absent",  count: absent,  color: "#F87171", bg: "rgba(239,68,68,0.1)", icon: <X size={12} /> },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: s.bg }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl">
                <span style={{ color: s.color }}>{s.icon}</span>
                <span style={{ color: s.color }} className="font-bold text-sm">{s.count}</span>
                <span style={{ color: s.color }} className="text-xs opacity-70">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Enrolled students */}
          <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-3">
              Enrolled Students ({enrolledKids.length})
            </p>
            {enrolledKids.length === 0 && (
              <p className="text-gray-600 text-sm">No students enrolled. Go to Sessions → Manage Students.</p>
            )}
            <div className="space-y-2">
              {enrolledKids.map(k => (
                <div key={k.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div style={{ backgroundColor: "rgba(0,229,204,0.12)", color: "#00E5CC", border: "1px solid rgba(0,229,204,0.2)" }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {k.name.charAt(0)}
                    </div>
                    <span className="text-white text-sm font-medium">{k.name}</span>
                  </div>
                  <select
                    style={{ ...STATUS_STYLE[attendance[k.id] || "present"], border: "none", outline: "none", cursor: "pointer", borderRadius: "8px" }}
                    className="px-3 py-1.5 text-xs font-semibold"
                    value={attendance[k.id] || "present"}
                    onChange={e => setAttendance(a => ({ ...a, [k.id]: e.target.value }))}
                    disabled={done}>
                    <option value="present" style={{ backgroundColor: "#0D1F3C", color: "white" }}>Present</option>
                    <option value="absent"  style={{ backgroundColor: "#0D1F3C", color: "white" }}>Absent</option>
    
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Walk-ins */}
          <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold">
                Walk-ins ({walkIns.length})
              </p>
              {!done && (
                <button onClick={() => setShowWalkIn(w => !w)} style={btnOutline}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all">
                  <UserPlus size={12} /> Add Walk-in
                </button>
              )}
            </div>

            {showWalkIn && (
              <div className="mb-3 space-y-2">
                <StudentFilter search="" onSearch={() => {}} ageFilter={walkInAge} onAge={setWalkInAge}
                  locationFilter={walkInLocation} onLocation={setWalkInLocation} locations={locations} />
                <div className="relative">
                  <input style={input}
                    className="w-full rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    placeholder="Search student name…" value={walkInSearch}
                    onChange={e => setWalkInSearch(e.target.value)} autoFocus />
                  {walkInSuggestions.length > 0 && (
                    <div style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.2)", top: "calc(100% + 4px)" }}
                      className="absolute left-0 right-0 rounded-xl overflow-hidden z-10 shadow-xl">
                      {walkInSuggestions.map(k => (
                        <button key={k.id} onClick={() => addWalkIn(k)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 text-left transition-colors">
                          <span className="text-white text-sm">{k.name}</span>
                          <span style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
                            className="text-xs px-2 py-0.5 rounded-full">{k.age_group}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {walkInSearch.length > 1 && walkInSuggestions.length === 0 && (
                    <p className="text-gray-600 text-xs mt-2">No students found.</p>
                  )}
                </div>
              </div>
            )}

            {walkIns.length === 0 && !showWalkIn && (
              <p className="text-gray-700 text-sm">No walk-ins.</p>
            )}

            <div className="space-y-2">
              {walkIns.map((w, i) => (
                <div key={w.kid_id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div style={{ backgroundColor: "rgba(251,191,36,0.12)", color: "#FCD34D", border: "1px solid rgba(251,191,36,0.2)" }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {w.kid?.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <span className="text-white text-sm font-medium">{w.kid?.name || w.kid_id}</span>
                      <span style={{ color: "#FCD34D" }} className="text-xs ml-2 opacity-70">walk-in</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select style={{ ...STATUS_STYLE[w.status], border: "none", outline: "none", cursor: "pointer", borderRadius: "8px" }}
                      className="px-3 py-1.5 text-xs font-semibold"
                      value={w.status}
                      onChange={e => setWalkIns(ws => ws.map((x, j) => j === i ? { ...x, status: e.target.value } : x))}
                      disabled={done}>
                      <option value="present" style={{ backgroundColor: "#0D1F3C", color: "white" }}>Present</option>
                      <option value="absent"  style={{ backgroundColor: "#0D1F3C", color: "white" }}>Absent</option>
                     
                    </select>
                    {!done && (
                      <button onClick={() => setWalkIns(ws => ws.filter((_, j) => j !== i))}
                        className="text-gray-600 hover:text-red-400 transition-colors">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="p-4">
            {done ? (
              <div style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC", border: "1px solid rgba(0,229,204,0.2)" }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-fit">
                <Check size={15} /> Attendance submitted
              </div>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} style={btnPrimary}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
                <ClipboardCheck size={15} />
                {submitting ? "Submitting…" : "Submit Attendance"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Session list / history view ──────────────────────────────────────────
  return (
    <div style={pageWrapper} className="p-5 sm:p-7 lg:p-9">

      {/* Header + mode toggle */}
      <div className="mb-7 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Attendance</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {mode === "week" ? "This week's sessions" : "Browse by location and month"}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}
          className="flex rounded-xl p-1 gap-1">
          {[
            { id: "week",    label: "This Week", icon: CalendarDays },
            { id: "history", label: "History",   icon: History      },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setMode(id)}
              style={mode === id
                ? { backgroundColor: "#00E5CC", color: "#080F1E" }
                : { color: "#6B7280" }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all">
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* This week */}
      {mode === "week" && (
        <>
          {loading && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div style={{ borderColor: "#00E5CC" }} className="animate-spin rounded-full h-4 w-4 border-b-2" />
              Loading sessions…
            </div>
          )}

          {!loading && sessions.length === 0 && (
            <div style={card} className="rounded-2xl p-12 text-center">
              <CalendarDays size={32} className="mx-auto mb-3 text-gray-600" />
              <p className="text-white font-semibold mb-1">No sessions this week</p>
              <p className="text-gray-500 text-sm">Add fixed sessions in the Sessions page first.</p>
            </div>
          )}

          {!loading && sessions.length > 0 && (() => {
            // Group by location
            const byLocation = {};
            sessions.forEach(s => {
              const lid = s.location_id || "unknown";
              const lname = s.locations?.name || "Unknown Location";
              if (!byLocation[lid]) byLocation[lid] = { name: lname, sessions: [] };
              byLocation[lid].sessions.push(s);
            });

            return (
              <div className="space-y-6">
                {Object.entries(byLocation).map(([lid, { name, sessions: lSessions }]) => (
                  <div key={lid}>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={14} style={{ color: "#00E5CC" }} />
                      <h2 className="text-white font-semibold text-sm">{name}</h2>
                      <span style={{ backgroundColor: "rgba(0,229,204,0.08)", color: "#00E5CC" }}
                        className="text-xs px-2 py-0.5 rounded-full">{lSessions.length} sessions</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {lSessions.map(s => (
                        <SessionCard key={s.id} s={s} onClick={() => handleSessionSelect(s)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {/* History */}
      {mode === "history" && (
        <HistoryView onSelectSession={handleSessionSelect} />
      )}
    </div>
  );
}