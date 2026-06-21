import { useEffect, useState, useCallback } from "react";
import { getCoaches, createCoach, deleteCoach } from "../api";
import {
  pageWrapper,
  card,
  input,
  btnPrimary,
  btnOutline,
} from "../components/UI";
import {
  UserPlus,
  Trash2,
  Phone,
  Mail,
  Users,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api",
});
api.interceptors.request.use((c) => {
  const u = JSON.parse(localStorage.getItem("user"));
  if (u?.access_token) c.headers.Authorization = `Bearer ${u.access_token}`;
  return c;
});

const getWeekAvailability = (week_start) =>
  api.get(`/availability/week?week_start=${week_start}`);
const getCoachAvailability = (coach_id, week_start) =>
  api.get(`/availability/coach/${coach_id}?week_start=${week_start}`);

const AGE_GROUPS = ["U7", "U13", "U12_DEV", "U13_GIRLS"];
const AGE_GROUP_LABELS = { U7: "U7", U13: "U13", U12_DEV: "U12 Development", U13_GIRLS: "U13 Girls" };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Date helpers ──────────────────────────────────────────────────────────────
function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatWeekLabel(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

// ── Weekly availability grid (admin overview) ─────────────────────────────────
function WeeklyAvailabilityGrid({ coaches }) {
  const [monday, setMonday] = useState(getMondayOfWeek(new Date()));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekStart = toDateStr(monday);
  const weekDates = getWeekDates(monday);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWeekAvailability(weekStart);
      setData(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const prevWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7);
    setMonday(d);
  };
  const nextWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 7);
    setMonday(d);
  };

  const submittedIds = new Set(data.map((d) => d.coach_id));
  const notSubmitted = coaches.filter((c) => !submittedIds.has(c.id));

  const isWeekendDate = (d) => { const day = d.getDay(); return day === 0 || day === 6; };

  // Count per weekday date, and per weekend date+slot
  const countByDate = {};
  const countByWeekendSlot = {}; // `${date}_${slot}` -> [coach]
  weekDates.forEach((d) => {
    const ds = toDateStr(d);
    countByDate[ds] = [];
    if (isWeekendDate(d)) {
      countByWeekendSlot[`${ds}_morning`] = [];
      countByWeekendSlot[`${ds}_afternoon`] = [];
    }
  });
  data.forEach((row) => {
    (row.dates || []).forEach((dateStr) => {
      if (countByDate[dateStr]) countByDate[dateStr].push(row.coach);
    });
    (row.weekend_slots || []).forEach(({ date, slot }) => {
      const key = `${date}_${slot}`;
      if (countByWeekendSlot[key]) countByWeekendSlot[key].push(row.coach);
    });
  });

  return (
    <div style={card} className="rounded-2xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p className="text-white font-semibold">Weekly Availability</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {data.length} of {coaches.length} coaches submitted
          </p>
        </div>
        {/* Week nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            style={{
              backgroundColor: "#0A1628",
              border: "1px solid rgba(0,229,204,0.2)",
              color: "#00E5CC",
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-cyan-500/10 transition-all"
          >
            <ChevronLeft size={14} />
          </button>
          <div
            style={{
              backgroundColor: "#0A1628",
              border: "1px solid rgba(0,229,204,0.15)",
            }}
            className="px-4 py-1.5 rounded-lg"
          >
            <p className="text-white text-xs font-semibold">
              {formatWeekLabel(monday)}
            </p>
          </div>
          <button
            onClick={nextWeek}
            style={{
              backgroundColor: "#0A1628",
              border: "1px solid rgba(0,229,204,0.2)",
              color: "#00E5CC",
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-cyan-500/10 transition-all"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-6 justify-center">
          <Loader2
            size={14}
            className="animate-spin"
            style={{ color: "#00E5CC" }}
          />{" "}
          Loading...
        </div>
      ) : (
        <>
          {/* Day columns */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDates.map((date, i) => {
              const dateStr = toDateStr(date);
              const total = coaches.length;
              const weekend = isWeekendDate(date);

              const renderCountBlock = (label, available) => {
                const count = available.length;
                const pct = total > 0 ? (count / total) * 100 : 0;
                const color =
                  pct >= 70 ? "#00E5CC" : pct >= 40 ? "#FCD34D" : count > 0 ? "#F87171" : "#374151";
                return (
                  <div key={label}>
                    {label && (
                      <p className="text-gray-500 text-center mb-0.5" style={{ fontSize: 9 }}>{label}</p>
                    )}
                    <div style={{ backgroundColor: `${color}18`, color }}
                      className="text-center text-xs font-bold py-1 rounded-lg mb-1">
                      {count}/{total}
                    </div>
                    <div style={{ backgroundColor: "rgba(255,255,255,0.06)" }} className="rounded-full h-1 mb-1.5">
                      <div style={{ width: `${pct}%`, backgroundColor: color, transition: "width 0.5s ease" }}
                        className="h-1 rounded-full" />
                    </div>
                    <div className="space-y-0.5">
                      {available.map((coach) => (
                        <p key={coach?.id} className="text-gray-400 truncate" style={{ fontSize: 9 }}>
                          {coach?.name?.split(" ")[0]}
                        </p>
                      ))}
                      {count === 0 && (
                        <p className="text-gray-700 text-center" style={{ fontSize: 9 }}>None</p>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div key={dateStr}
                  style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }}
                  className="rounded-xl p-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-center mb-1"
                    style={{ color: i >= 5 ? "#00E5CC" : "#6B7280" }}>
                    {DAYS[i]}
                  </p>
                  <p className="text-white font-bold text-center text-sm mb-2">{date.getDate()}</p>

                  {weekend ? (
                    <div className="space-y-2">
                      {renderCountBlock("AM", countByWeekendSlot[`${dateStr}_morning`] || [])}
                      {renderCountBlock("PM", countByWeekendSlot[`${dateStr}_afternoon`] || [])}
                    </div>
                  ) : (
                    renderCountBlock(null, countByDate[dateStr] || [])
                  )}
                </div>
              );
            })}
          </div>

          {/* Not submitted warning */}
          {notSubmitted.length > 0 && (
            <div
              style={{
                backgroundColor: "rgba(251,191,36,0.06)",
                border: "1px solid rgba(251,191,36,0.15)",
              }}
              className="rounded-xl p-3 flex items-start gap-2.5"
            >
              <AlertCircle
                size={14}
                style={{ color: "#FCD34D" }}
                className="flex-shrink-0 mt-0.5"
              />
              <div>
                <p
                  className="text-xs font-semibold mb-1"
                  style={{ color: "#FCD34D" }}
                >
                  {notSubmitted.length} coach
                  {notSubmitted.length !== 1 ? "es" : ""} haven't submitted
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {notSubmitted.map((c) => (
                    <span
                      key={c.id}
                      style={{
                        backgroundColor: "rgba(251,191,36,0.08)",
                        color: "#FCD34D",
                      }}
                      className="text-xs px-2 py-0.5 rounded-full"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Individual coach availability panel ───────────────────────────────────────
function CoachAvailabilityPanel({ coach, onClose }) {
  const [monday, setMonday] = useState(getMondayOfWeek(new Date()));
  const [dates, setDates] = useState([]);
  const [weekendSlots, setWeekendSlots] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const weekStart = toDateStr(monday);
  const weekDates = getWeekDates(monday);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCoachAvailability(coach.id, weekStart);
      setDates(res.data.dates || []);
      setWeekendSlots(res.data.weekend_slots || []);
      setNotes(res.data.notes || "");
    } catch (e) {
      setDates([]);
      setWeekendSlots([]);
      setNotes("");
    }
    setLoading(false);
  }, [coach.id, weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const prevWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7);
    setMonday(d);
  };
  const nextWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 7);
    setMonday(d);
  };

  return (
    <div
      style={{
        backgroundColor: "#0D1F3C",
        border: "1px solid rgba(0,229,204,0.25)",
      }}
      className="rounded-2xl overflow-hidden mb-6"
    >
      {/* Panel header */}
      <div
        style={{
          backgroundColor: "#080F1E",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
        className="p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            style={{
              color: "#9CA3AF",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
          </button>
          <div
            style={{
              backgroundColor: "rgba(0,229,204,0.15)",
              color: "#00E5CC",
              border: "1px solid rgba(0,229,204,0.2)",
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
          >
            {coach.name.charAt(0)}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{coach.name}</p>
            <p className="text-gray-500 text-xs">{coach.email}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4">
        {/* Week nav */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={prevWeek}
            style={{
              backgroundColor: "#0A1628",
              border: "1px solid rgba(0,229,204,0.2)",
              color: "#00E5CC",
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-cyan-500/10 transition-all"
          >
            <ChevronLeft size={14} />
          </button>
          <div
            style={{
              backgroundColor: "#0A1628",
              border: "1px solid rgba(0,229,204,0.15)",
            }}
            className="flex-1 px-4 py-1.5 rounded-lg text-center"
          >
            <p className="text-white text-xs font-semibold">
              {formatWeekLabel(monday)}
            </p>
          </div>
          <button
            onClick={nextWeek}
            style={{
              backgroundColor: "#0A1628",
              border: "1px solid rgba(0,229,204,0.2)",
              color: "#00E5CC",
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-cyan-500/10 transition-all"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-8">
            <Loader2
              size={14}
              className="animate-spin"
              style={{ color: "#00E5CC" }}
            />{" "}
            Loading...
          </div>
        ) : (
          <>
            {/* Day grid */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDates.map((date, i) => {
                const dateStr = toDateStr(date);
                const day = date.getDay();
                const weekend = day === 0 || day === 6;
                const avail = dates.includes(dateStr);
                const amOn = weekendSlots.some(w => w.date === dateStr && w.slot === "morning");
                const pmOn = weekendSlots.some(w => w.date === dateStr && w.slot === "afternoon");

                if (weekend) {
                  return (
                    <div key={dateStr}
                      style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }}
                      className="rounded-xl p-2 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#00E5CC" }}>{DAYS[i]}</span>
                      <span className="font-bold text-sm text-white">{date.getDate()}</span>
                      <span style={amOn
                          ? { backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }
                          : { backgroundColor: "rgba(255,255,255,0.04)", color: "#4B5563" }}
                        className="text-[10px] font-bold w-full text-center py-0.5 rounded">AM</span>
                      <span style={pmOn
                          ? { backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }
                          : { backgroundColor: "rgba(255,255,255,0.04)", color: "#4B5563" }}
                        className="text-[10px] font-bold w-full text-center py-0.5 rounded">PM</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={dateStr}
                    style={
                      avail
                        ? { backgroundColor: "rgba(0,229,204,0.12)", border: "2px solid rgba(0,229,204,0.4)" }
                        : { backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }
                    }
                    className="rounded-xl p-2.5 flex flex-col items-center gap-1"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: avail ? "#00E5CC" : "#6B7280" }}>
                      {DAYS[i]}
                    </span>
                    <span className="font-bold text-sm" style={{ color: avail ? "#00E5CC" : "#9CA3AF" }}>
                      {date.getDate()}
                    </span>
                    {avail ? (
                      <Check size={13} style={{ color: "#00E5CC" }} />
                    ) : (
                      <X size={11} style={{ color: "#374151" }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {(dates.length > 0 || weekendSlots.length > 0) ? (
              <div
                style={{
                  backgroundColor: "rgba(0,229,204,0.06)",
                  border: "1px solid rgba(0,229,204,0.15)",
                }}
                className="rounded-xl p-3 mb-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={13} style={{ color: "#00E5CC" }} />
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "#00E5CC" }}
                  >
                    Available {dates.length + weekendSlots.length} slot{(dates.length + weekendSlots.length) !== 1 ? "s" : ""}{" "}
                    this week
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[...dates].sort().map((d) => {
                    const date = new Date(d + "T00:00:00");
                    return (
                      <span
                        key={d}
                        style={{
                          backgroundColor: "rgba(0,229,204,0.1)",
                          color: "#00E5CC",
                        }}
                        className="text-xs px-2.5 py-1 rounded-full"
                      >
                        {date.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    );
                  })}
                  {[...weekendSlots].sort((a,b) => a.date.localeCompare(b.date)).map((w) => {
                    const date = new Date(w.date + "T00:00:00");
                    return (
                      <span
                        key={`${w.date}-${w.slot}`}
                        style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
                        className="text-xs px-2.5 py-1 rounded-full capitalize"
                      >
                        {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {w.slot}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                className="rounded-xl p-4 mb-3 text-center"
              >
                <Clock size={18} className="mx-auto mb-1.5 text-gray-600" />
                <p className="text-gray-500 text-sm">
                  No availability submitted for this week
                </p>
              </div>
            )}

            {notes && (
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                className="rounded-xl p-3"
              >
                <p className="text-xs text-gray-500 mb-1">Coach notes</p>
                <p className="text-gray-300 text-sm italic">"{notes}"</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Coaches page ─────────────────────────────────────────────────────────
export default function Coaches() {
  const [coaches, setCoaches] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    age_groups: [],
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCoach, setSelected] = useState(null);

  useEffect(() => {
    getCoaches().then((r) => {
      setCoaches(r.data);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createCoach(form);
    getCoaches().then((r) => setCoaches(r.data));
    setForm({ name: "", email: "", phone: "", age_groups: [] });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this coach?")) return;
    await deleteCoach(id);
    setCoaches(coaches.filter((c) => c.id !== id));
    if (selectedCoach?.id === id) setSelected(null);
  };

  const toggleGroup = (g) => {
    setForm((f) => ({
      ...f,
      age_groups: f.age_groups.includes(g)
        ? f.age_groups.filter((x) => x !== g)
        : [...f.age_groups, g],
    }));
  };

  return (
    <div style={pageWrapper} className="p-5 sm:p-7 lg:p-9">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Coaches
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage your academy coaching staff
          </p>
        </div>
        <button
          onClick={() => setShowForm((f) => !f)}
          style={showForm ? btnOutline : btnPrimary}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all"
        >
          {showForm ? (
            <>
              <X size={15} /> Cancel
            </>
          ) : (
            <>
              <UserPlus size={15} /> Add Coach
            </>
          )}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={card} className="rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus size={16} style={{ color: "#00E5CC" }} /> New Coach
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { placeholder: "Full name", key: "name", icon: Users },
                {
                  placeholder: "Email address",
                  key: "email",
                  type: "email",
                  icon: Mail,
                },
                { placeholder: "Phone number", key: "phone", icon: Phone },
              ].map(({ placeholder, key, type, icon: Icon }) => (
                <div key={key} className="relative">
                  <Icon
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    style={input}
                    className="w-full rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    placeholder={placeholder}
                    type={type || "text"}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                    required={key !== "phone"}
                  />
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">
                Age Groups
              </p>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUPS.map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => toggleGroup(g)}
                    style={
                      form.age_groups.includes(g)
                        ? {
                            backgroundColor: "#00E5CC",
                            color: "#080F1E",
                            border: "1px solid #00E5CC",
                          }
                        : {
                            backgroundColor: "transparent",
                            color: "#6B7280",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }
                    }
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all hover:border-cyan-500/40"
                  >
                    {AGE_GROUP_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>
            <button
              style={btnPrimary}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all"
            >
              <Plus size={15} /> Add Coach
            </button>
          </form>
        </div>
      )}

      {/* ── Weekly availability grid at top ── */}
      {!loading && coaches.length > 0 && (
        <WeeklyAvailabilityGrid coaches={coaches} />
      )}

      {/* ── Per-coach availability panel (shown when a coach is clicked) ── */}
      {selectedCoach && (
        <CoachAvailabilityPanel
          coach={selectedCoach}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Coaches list */}
      <div style={card} className="rounded-2xl overflow-hidden">
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="font-semibold text-white text-sm">All Coaches</p>
          <span
            style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
            className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
          >
            {coaches.length}
          </span>
        </div>

        {loading && (
          <p className="p-8 text-center text-gray-600 text-sm">Loading…</p>
        )}

        <div className="divide-y divide-white/5">
          {coaches.map((c) => {
            const isSelected = selectedCoach?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelected(isSelected ? null : c)}
                style={
                  isSelected
                    ? {
                        backgroundColor: "rgba(0,229,204,0.06)",
                        cursor: "pointer",
                      }
                    : { cursor: "pointer" }
                }
                className="flex items-center gap-4 p-4 hover:bg-white/2 transition-colors group"
              >
                {/* Avatar */}
                <div
                  style={
                    isSelected
                      ? {
                          background: "linear-gradient(135deg,#00E5CC,#00BFA5)",
                          color: "#080F1E",
                        }
                      : {
                          background:
                            "linear-gradient(135deg,#00E5CC22,#00E5CC11)",
                          border: "1px solid rgba(0,229,204,0.2)",
                          color: "#00E5CC",
                        }
                  }
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                >
                  {c.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{c.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-gray-500 text-xs">
                      <Mail size={11} /> {c.email}
                    </span>
                    {c.phone && (
                      <span className="flex items-center gap-1 text-gray-500 text-xs">
                        <Phone size={11} /> {c.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Age groups */}
                <div className="hidden sm:flex flex-wrap gap-1 max-w-xs justify-end">
                  {c.age_groups?.map((g) => (
                    <span
                      key={g}
                      style={{
                        backgroundColor: "rgba(0,229,204,0.08)",
                        color: "#00E5CC",
                        border: "1px solid rgba(0,229,204,0.15)",
                      }}
                      className="px-2 py-0.5 rounded-lg text-xs font-medium"
                    >
                      {AGE_GROUP_LABELS[g] || g}
                    </span>
                  ))}
                </div>

                {/* View availability hint */}
                <span
                  className="text-xs hidden group-hover:block flex-shrink-0"
                  style={{ color: "#00E5CC" }}
                >
                  {isSelected ? "Hide ↑" : "View availability →"}
                </span>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
                  style={{
                    color: "#F87171",
                    border: "1px solid rgba(248,113,113,0.2)",
                  }}
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            );
          })}
        </div>

        {!loading && coaches.length === 0 && (
          <div className="p-12 text-center">
            <div
              style={{
                backgroundColor: "rgba(0,229,204,0.08)",
                color: "#00E5CC",
              }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            >
              <Users size={22} />
            </div>
            <p className="text-gray-500 text-sm">
              No coaches yet. Add your first coach above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
