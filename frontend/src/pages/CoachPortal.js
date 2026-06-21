import { useEffect, useState, useCallback } from "react";
import { getNotifications, markNotificationRead } from "../api";
import { useAuth } from "../context/AuthContext";
import { pageWrapper, card, input, btnPrimary } from "../components/UI";
import {
  Check, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, Loader2, Bell, BellOff, AlertCircle
} from "lucide-react";
import axios from "axios";

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api" });
api.interceptors.request.use(c => {
  const u = JSON.parse(localStorage.getItem("user"));
  if (u?.access_token) c.headers.Authorization = `Bearer ${u.access_token}`;
  return c;
});

const submitAvailability   = (data)                 => api.post("/availability/submit", data);
const getCoachAvailability = (coach_id, week_start) => api.get(`/availability/coach/${coach_id}?week_start=${week_start}`);

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOfWeek(date) {
  const d    = new Date(date);
  const day  = d.getDay();
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
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function formatWeekLabel(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(monday)} - ${fmt(sunday)}`;
}

function isWeekend(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

function AvailabilitySection({ coachId }) {
  const [monday, setMonday]          = useState(getMondayOfWeek(new Date()));
  const [selectedDates, setSelected] = useState([]);          // weekday full-day dates
  const [weekendSlots, setWeekendSlots] = useState([]);       // [{date, slot}]
  const [notes, setNotes]            = useState("");
  const [loading, setLoading]        = useState(false);
  const [saving, setSaving]          = useState(false);
  const [saved, setSaved]            = useState(false);
  const [error, setError]            = useState("");

  const weekStart = toDateStr(monday);
  const weekDates = getWeekDates(monday);
  const todayStr  = toDateStr(new Date());

  const loadExisting = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);
    try {
      const res = await getCoachAvailability(coachId, weekStart);
      setSelected(res.data.dates || []);
      setWeekendSlots(res.data.weekend_slots || []);
      setNotes(res.data.notes   || "");
    } catch (e) {
      setSelected([]);
      setWeekendSlots([]);
      setNotes("");
    }
    setLoading(false);
  }, [coachId, weekStart]);

  useEffect(() => {
    setSaved(false);
    loadExisting();
  }, [loadExisting]);

  const toggleDate = (dateStr) => {
    setSelected(s =>
      s.includes(dateStr) ? s.filter(d => d !== dateStr) : [...s, dateStr]
    );
    setSaved(false);
  };

  const toggleWeekendSlot = (dateStr, slot) => {
    setWeekendSlots(ws => {
      const exists = ws.find(w => w.date === dateStr && w.slot === slot);
      if (exists) return ws.filter(w => !(w.date === dateStr && w.slot === slot));
      return [...ws, { date: dateStr, slot }];
    });
    setSaved(false);
  };

  const hasSlot = (dateStr, slot) => weekendSlots.some(w => w.date === dateStr && w.slot === slot);

  const handleSubmit = async () => {
    setError("");

    if (!coachId) {
      setError("Your account is not linked to a coach record. Ask an admin to link your account in User Management.");
      return;
    }

    setSaving(true);
    try {
      await submitAvailability({
        coach_id:      coachId,
        dates:         selectedDates,
        weekend_slots: weekendSlots,
        week_start:    weekStart,
        notes:         notes || null,
      });
      setSaved(true);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to submit. Please try again.");
      console.error(e);
    }
    setSaving(false);
  };

  const prevWeek = () => { const d = new Date(monday); d.setDate(d.getDate()-7); setMonday(d); };
  const nextWeek = () => { const d = new Date(monday); d.setDate(d.getDate()+7); setMonday(d); };

  // Show warning if coach not linked
  if (!coachId) {
    return (
      <div style={card} className="rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div style={{ backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock size={17} />
          </div>
          <div>
            <p className="text-white font-semibold">Weekly Availability</p>
            <p className="text-gray-500 text-xs mt-0.5">Select the days you can coach this week</p>
          </div>
        </div>
        <div style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}
          className="rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} style={{ color: "#FCD34D" }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#FCD34D" }}>Account not linked</p>
            <p className="text-gray-400 text-xs">
              Your login is not linked to a coach record. Ask an admin to go to User Management and link your account to your coach profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalSelected = selectedDates.length + weekendSlots.length;

  return (
    <div style={card} className="rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div style={{ backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
          <Clock size={17} />
        </div>
        <div>
          <p className="text-white font-semibold">Weekly Availability</p>
          <p className="text-gray-500 text-xs mt-0.5">Weekdays: full day · Weekends: morning / afternoon</p>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={prevWeek}
          style={{ backgroundColor: "#0A1628", border: "1px solid rgba(0,229,204,0.2)", color: "#00E5CC" }}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-cyan-500/10 transition-all flex-shrink-0">
          <ChevronLeft size={15} />
        </button>
        <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(0,229,204,0.15)" }}
          className="flex-1 px-4 py-2 rounded-xl text-center">
          <p className="text-white font-semibold text-sm">{formatWeekLabel(monday)}</p>
        </div>
        <button onClick={nextWeek}
          style={{ backgroundColor: "#0A1628", border: "1px solid rgba(0,229,204,0.2)", color: "#00E5CC" }}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-cyan-500/10 transition-all flex-shrink-0">
          <ChevronRight size={15} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-10">
          <Loader2 size={14} className="animate-spin" style={{ color: "#00E5CC" }} />
          Loading your availability...
        </div>
      ) : (
        <>
          {/* Day picker grid */}
          <div className="grid grid-cols-7 gap-2 mb-5">
            {weekDates.map((date, i) => {
              const dateStr  = toDateStr(date);
              const weekend  = isWeekend(dateStr);
              const selected = selectedDates.includes(dateStr);
              const isToday  = dateStr === todayStr;
              const isPast   = dateStr < todayStr;
              const amOn = hasSlot(dateStr, "morning");
              const pmOn = hasSlot(dateStr, "afternoon");

              if (weekend) {
                return (
                  <div key={dateStr}
                    style={{ backgroundColor: "#0A1628", border: isToday ? "1px solid rgba(0,229,204,0.5)" : "1px solid rgba(255,255,255,0.08)" }}
                    className="rounded-xl p-2 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#00E5CC" }}>{DAYS[i]}</span>
                    <span className="text-base font-bold text-white">{date.getDate()}</span>
                    <button disabled={isPast} onClick={() => toggleWeekendSlot(dateStr, "morning")}
                      style={amOn
                        ? { backgroundColor: "#00E5CC", color: "#080F1E" }
                        : { backgroundColor: "rgba(255,255,255,0.05)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}
                      className="w-full text-[10px] font-bold py-1 rounded-md disabled:opacity-30 disabled:cursor-not-allowed">
                      AM
                    </button>
                    <button disabled={isPast} onClick={() => toggleWeekendSlot(dateStr, "afternoon")}
                      style={pmOn
                        ? { backgroundColor: "#00E5CC", color: "#080F1E" }
                        : { backgroundColor: "rgba(255,255,255,0.05)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}
                      className="w-full text-[10px] font-bold py-1 rounded-md disabled:opacity-30 disabled:cursor-not-allowed">
                      PM
                    </button>
                  </div>
                );
              }

              return (
                <button
                  key={dateStr}
                  onClick={() => !isPast && toggleDate(dateStr)}
                  disabled={isPast}
                  style={selected
                    ? { backgroundColor: "#00E5CC", color: "#080F1E", border: "2px solid #00E5CC" }
                    : isPast
                    ? { backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", opacity: 0.35 }
                    : isToday
                    ? { backgroundColor: "#0A1628", border: "1px solid rgba(0,229,204,0.5)", color: "#00E5CC" }
                    : { backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.08)", color: "#9CA3AF" }}
                  className="rounded-xl p-2.5 sm:p-3 flex flex-col items-center gap-1 transition-all hover:border-cyan-500/40 disabled:cursor-not-allowed"
                >
                  <span className={`text-xs font-bold uppercase tracking-wide ${
                    selected ? "text-[#080F1E]" : isToday ? "text-[#00E5CC]" : "text-gray-500"
                  }`}>
                    {DAYS[i]}
                  </span>
                  <span className={`text-base sm:text-lg font-bold ${
                    selected ? "text-[#080F1E]" : isToday ? "text-[#00E5CC]" : "text-white"
                  }`}>
                    {date.getDate()}
                  </span>
                  <div className="h-4 flex items-center justify-center">
                    {selected
                      ? <Check size={13} className="text-[#080F1E]" />
                      : isToday
                      ? <div style={{ backgroundColor: "#00E5CC" }} className="w-1.5 h-1.5 rounded-full" />
                      : null
                    }
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected summary */}
          {totalSelected > 0 ? (
            <div style={{ backgroundColor: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.15)" }}
              className="rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-400 mb-2">
                Available <span style={{ color: "#00E5CC" }} className="font-semibold">{totalSelected} slot{totalSelected !== 1 ? "s" : ""}</span> this week
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...selectedDates].sort().map(d => {
                  const date = new Date(d + "T00:00:00");
                  return (
                    <span key={d}
                      style={{ backgroundColor: "rgba(0,229,204,0.12)", color: "#00E5CC" }}
                      className="text-xs px-2.5 py-1 rounded-full font-medium">
                      {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                  );
                })}
                {[...weekendSlots].sort((a,b) => a.date.localeCompare(b.date)).map(w => {
                  const date = new Date(w.date + "T00:00:00");
                  return (
                    <span key={`${w.date}-${w.slot}`}
                      style={{ backgroundColor: "rgba(0,229,204,0.12)", color: "#00E5CC" }}
                      className="text-xs px-2.5 py-1 rounded-full font-medium capitalize">
                      {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {w.slot}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              className="rounded-xl p-4 mb-4 text-center">
              <Clock size={18} className="mx-auto mb-1.5 text-gray-600" />
              <p className="text-gray-500 text-sm">No days selected</p>
              <p className="text-gray-600 text-xs mt-0.5">Tap weekdays for full-day, or AM/PM for weekends</p>
            </div>
          )}

          {/* Notes */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1.5 block">Notes for admin (optional)</label>
            <textarea style={input} rows={2}
              className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/40 resize-none"
              placeholder="Any constraints or info the admin should know..."
              value={notes} onChange={e => { setNotes(e.target.value); setSaved(false); }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              className="rounded-xl p-3 mb-4 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} disabled={saving} style={btnPrimary}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                : <><Check size={14} /> Submit Availability</>
              }
            </button>
            {saved && (
              <div className="flex items-center gap-1.5 text-sm" style={{ color: "#00E5CC" }}>
                <CheckCircle2 size={15} /> Saved
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NotificationsSection({ coachId }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    if (!coachId) { setLoading(false); return; }
    getNotifications(coachId)
      .then(r => setNotifications(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coachId]);

  const handleRead = async (id) => {
    await markNotificationRead(id);
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
  };

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div style={card} className="rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div style={{ backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell size={17} />
          </div>
          <div>
            <p className="text-white font-semibold">Notifications</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <span style={{ backgroundColor: "#00E5CC", color: "#0A1628" }}
            className="text-xs px-2.5 py-0.5 rounded-full font-bold">
            {unread} new
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-8">
          <Loader2 size={14} className="animate-spin" style={{ color: "#00E5CC" }} />
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ backgroundColor: "#0A1628" }} className="rounded-xl p-8 text-center">
          <BellOff size={24} className="mx-auto mb-2 text-gray-600" />
          <p className="text-gray-500 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {notifications.map(n => (
            <div key={n.id}
              style={n.is_read
                ? { backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.05)" }
                : { backgroundColor: "rgba(0,229,204,0.05)", border: "1px solid rgba(0,229,204,0.2)", borderLeft: "3px solid #00E5CC" }}
              className="rounded-lg p-3">
              <p className="text-sm text-white leading-snug">{n.message}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {new Date(n.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric"
                  })}
                </span>
                {!n.is_read && (
                  <button onClick={() => handleRead(n.id)}
                    style={{ color: "#00E5CC" }}
                    className="text-xs hover:underline">
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoachPortal() {
  const { user } = useAuth();
  const coachId  = user?.coach?.id;
  const name     = user?.coach?.name || user?.profile?.first_name || "Coach";
  const groups   = user?.coach?.age_groups || [];

  return (
    <div style={pageWrapper} className="p-5 sm:p-7 lg:p-9">
      <div className="mb-7">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Welcome, <span style={{ color: "#00E5CC" }}>{name}</span>
        </h1>
        {groups.length > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-gray-500 text-sm">Age groups:</span>
            {groups.map(g => (
              <span key={g}
                style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC", border: "1px solid rgba(0,229,204,0.2)" }}
                className="text-xs px-2.5 py-1 rounded-full font-medium">{g}</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AvailabilitySection coachId={coachId} />
        <NotificationsSection coachId={coachId} />
      </div>
    </div>
  );
}