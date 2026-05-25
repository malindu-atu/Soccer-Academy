import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Check, Clock,
  Users, GraduationCap, Trash2, Edit3, Calendar, Plus, X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getCoaches, getKids } from "../api";
import { pageWrapper, card, input, btnPrimary, btnOutline } from "../components/UI";
import axios from "axios";

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api" });
api.interceptors.request.use(c => {
  const u = JSON.parse(localStorage.getItem("user"));
  if (u?.access_token) c.headers.Authorization = `Bearer ${u.access_token}`;
  return c;
});

const getEvents   = (month) => api.get(`/events/?month=${month}`);
const createEvent = (data)  => api.post("/events/", data);
const updateEvent = (id, d) => api.put(`/events/${id}`, d);
const deleteEvent = (id)    => api.delete(`/events/${id}`);

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

const STATUS_CFG = {
  pending:   { color: "#FCD34D", bg: "rgba(251,191,36,0.15)",  label: "Pending",   icon: Clock  },
  completed: { color: "#00E5CC", bg: "rgba(0,229,204,0.15)",   label: "Completed", icon: Check  },
  cancelled: { color: "#F87171", bg: "rgba(239,68,68,0.15)",   label: "Cancelled", icon: X      },
};

function toMonthStr(y, m) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function EventDot({ event, onClick }) {
  const cfg = STATUS_CFG[event.status] || STATUS_CFG.pending;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(event); }}
      style={{ backgroundColor: cfg.bg, borderLeft: `2px solid ${cfg.color}`, cursor: "pointer" }}
      className="text-xs px-1.5 py-0.5 rounded-r-md mb-0.5 truncate hover:opacity-80 transition-opacity"
    >
      <span style={{ color: cfg.color }} className="font-semibold truncate block">{event.title}</span>
    </div>
  );
}

function EventModal({ event, date, coaches, kids, onSave, onDelete, onClose }) {
  const isNew = !event;
  const [form, setForm] = useState({
    title:       event?.title       || "",
    description: event?.description || "",
    date:        event?.date        || date || "",
    status:      event?.status      || "pending",
    coach_ids:   event?.coaches?.map(c => c.id) || [],
    kid_ids:     event?.kids?.map(k => k.id)    || [],
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab]       = useState("details");

  const toggleCoach = (id) => setForm(f => ({
    ...f, coach_ids: f.coach_ids.includes(id)
      ? f.coach_ids.filter(x => x !== id)
      : [...f.coach_ids, id]
  }));

  const toggleKid = (id) => setForm(f => ({
    ...f, kid_ids: f.kid_ids.includes(id)
      ? f.kid_ids.filter(x => x !== id)
      : [...f.kid_ids, id]
  }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      await onSave(form, event?.id);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div
        style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.25)", width: "100%", maxWidth: 520 }}
        className="rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
              className="w-9 h-9 rounded-xl flex items-center justify-center">
              <Calendar size={17} />
            </div>
            <div>
              <p className="text-white font-semibold">{isNew ? "New Event" : "Edit Event"}</p>
              <p className="text-gray-500 text-xs">{form.date}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", backgroundColor: "#080F1E" }}
          className="flex px-5">
          {[
            { id: "details",  label: "Details" },
            { id: "coaches",  label: `Coaches (${form.coach_ids.length})` },
            { id: "students", label: `Students (${form.kid_ids.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={tab === t.id
                ? { color: "#00E5CC", borderBottom: "2px solid #00E5CC" }
                : { color: "#6B7280" }}
              className="px-4 py-3 text-xs font-semibold transition-colors">
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {tab === "details" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Event Title *</label>
                <input style={input}
                  className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                  placeholder="e.g. Test Week, Holiday Camp, Tournament"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Date *</label>
                <input style={input} type="date"
                  className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Description</label>
                <textarea style={input} rows={3}
                  className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/40 resize-none"
                  placeholder="Optional notes about this event..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Status</label>
                <div className="flex gap-2">
                  {Object.entries(STATUS_CFG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button key={key} type="button"
                        onClick={() => setForm(f => ({ ...f, status: key }))}
                        style={form.status === key
                          ? { backgroundColor: cfg.color, color: "#0A1628" }
                          : { backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5">
                        <Icon size={12} /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "coaches" && (
            <div>
              <p className="text-gray-500 text-xs mb-3">Select coaches assigned to this event</p>
              <div className="space-y-2">
                {coaches.length === 0 && <p className="text-gray-600 text-sm text-center py-6">No coaches found</p>}
                {coaches.map(c => {
                  const sel = form.coach_ids.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleCoach(c.id)}
                      style={sel
                        ? { backgroundColor: "rgba(0,229,204,0.1)", border: "1px solid rgba(0,229,204,0.4)" }
                        : { backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left">
                      <div style={sel
                          ? { backgroundColor: "#00E5CC", color: "#0A1628" }
                          : { backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {sel ? <Check size={14} /> : c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{c.name}</p>
                        <p className="text-gray-500 text-xs">{c.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "students" && (
            <div>
              <p className="text-gray-500 text-xs mb-3">Select students attending this event</p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {kids.length === 0 && <p className="text-gray-600 text-sm text-center py-6">No students found</p>}
                {kids.map(k => {
                  const sel = form.kid_ids.includes(k.id);
                  return (
                    <button key={k.id} onClick={() => toggleKid(k.id)}
                      style={sel
                        ? { backgroundColor: "rgba(0,229,204,0.1)", border: "1px solid rgba(0,229,204,0.4)" }
                        : { backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left">
                      <div style={sel
                          ? { backgroundColor: "#00E5CC", color: "#0A1628" }
                          : { backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {sel ? <Check size={12} /> : k.name.charAt(0)}
                      </div>
                      <span className="text-white text-sm flex-1">{k.name}</span>
                      <span style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
                        className="text-xs px-2 py-0.5 rounded-full">{k.age_group}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          className="p-4 flex items-center justify-between gap-3">
          <div>
            {!isNew && onDelete && (
              <button onClick={() => onDelete(event.id)}
                style={{ color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs hover:bg-red-500/10 transition-all">
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF" }}
              className="px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !form.title.trim()} style={btnPrimary}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
              <Check size={14} /> {saving ? "Saving..." : isNew ? "Create Event" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventDetail({ event, onEdit, onClose, isAdmin }) {
  const cfg  = STATUS_CFG[event.status] || STATUS_CFG.pending;
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.2)", width: "100%", maxWidth: 400 }}
        className="rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-bold text-lg">{event.title}</h3>
            <p className="text-gray-400 text-xs mt-0.5">{event.date}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>

        <div style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}40` }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 w-fit">
          <Icon size={13} style={{ color: cfg.color }} />
          <span style={{ color: cfg.color }} className="text-xs font-semibold">{cfg.label}</span>
        </div>

        {event.description && (
          <p className="text-gray-400 text-sm mb-4">{event.description}</p>
        )}

        {event.coaches?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
              <Users size={11} /> Coaches ({event.coaches.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {event.coaches.map(c => (
                <span key={c.id} style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
                  className="text-xs px-2.5 py-1 rounded-full">{c.name}</span>
              ))}
            </div>
          </div>
        )}

        {event.kids?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
              <GraduationCap size={11} /> Students ({event.kids.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {event.kids.map(k => (
                <span key={k.id} style={{ backgroundColor: "rgba(167,139,250,0.1)", color: "#A78BFA" }}
                  className="text-xs px-2.5 py-1 rounded-full">{k.name}</span>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <button onClick={() => onEdit(event)} style={btnPrimary}
            className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
            <Edit3 size={13} /> Edit Event
          </button>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === "admin";

  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents]   = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [kids, setKids]       = useState([]);
  const [loading, setLoading] = useState(true);

  const [createModal, setCreateModal] = useState(null);
  const [editModal, setEditModal]     = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const monthStr = toMonthStr(year, month);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEvents(monthStr);
      setEvents(res.data || []);
    } catch (e) {
      console.error("Failed to load events:", e);
      setEvents([]);
    }
    setLoading(false);
  }, [monthStr]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  useEffect(() => {
    getCoaches().then(r => setCoaches(r.data || [])).catch(() => {});
    getKids().then(r => setKids(r.data || [])).catch(() => {});
  }, []);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handleDayClick = (dateStr) => {
    if (!isAdmin) return;
    setCreateModal({ date: dateStr });
  };

  const handleSave = async (form, eventId) => {
    try {
      if (eventId) {
        await updateEvent(eventId, form);
      } else {
        await createEvent(form);
      }
      setCreateModal(null);
      setEditModal(null);
      setDetailModal(null);
      // Reload events after save
      await loadEvents();
    } catch (e) {
      console.error("Failed to save event:", e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await deleteEvent(id);
      setDetailModal(null);
      setEditModal(null);
      await loadEvents();
    } catch (e) {
      console.error("Failed to delete event:", e);
    }
  };

  // Build calendar grid
  const daysInMonth   = getDaysInMonth(year, month);
  const firstDayOfWk  = getFirstDayOfWeek(year, month);
  const totalCells    = Math.ceil((firstDayOfWk + daysInMonth) / 7) * 7;

  // Map events by date string
  const eventsByDate = {};
  events.forEach(ev => {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  });

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  return (
    <div style={pageWrapper} className="p-5 sm:p-7 lg:p-9">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Session Plan</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isAdmin ? "Click any day to add an event" : "View scheduled events and sessions"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth}
            style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.2)", color: "#00E5CC" }}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-cyan-500/10 transition-all">
            <ChevronLeft size={16} />
          </button>
          <div style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.2)" }}
            className="px-5 py-2 rounded-xl min-w-[160px] text-center">
            <p className="text-white font-bold text-sm">{MONTHS[month]} {year}</p>
          </div>
          <button onClick={nextMonth}
            style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.2)", color: "#00E5CC" }}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-cyan-500/10 transition-all">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        {Object.entries(STATUS_CFG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <Icon size={12} style={{ color: cfg.color }} />
              <span style={{ color: cfg.color }} className="text-xs font-medium">{cfg.label}</span>
            </div>
          );
        })}
        {isAdmin && <span className="text-gray-600 text-xs ml-2">· Click any day to add an event</span>}
      </div>

      {/* Calendar grid */}
      <div style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(255,255,255,0.07)" }}
        className="rounded-2xl overflow-hidden">

        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ backgroundColor: "#080F1E" }}>
          {DAYS.map(d => (
            <div key={d} className="py-3 text-center">
              <span style={{ color: d === "Sun" || d === "Sat" ? "#00E5CC" : "#6B7280" }}
                className="text-xs font-bold uppercase tracking-wider">{d}</span>
            </div>
          ))}
        </div>

        {/* Cells */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 text-sm gap-2">
            <div style={{ borderColor: "#00E5CC" }} className="animate-spin rounded-full h-5 w-5 border-b-2" />
            Loading events...
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum  = i - firstDayOfWk + 1;
              const isValid = dayNum >= 1 && dayNum <= daysInMonth;
              const dateStr = isValid
                ? `${year}-${String(month+1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`
                : null;
              const isToday   = dateStr === todayStr;
              const isWeekend = i % 7 === 0 || i % 7 === 6;
              const dayEvents = dateStr ? (eventsByDate[dateStr] || []) : [];

              return (
                <div
                  key={i}
                  onClick={() => isValid && handleDayClick(dateStr)}
                  style={{
                    borderTop:   "1px solid rgba(255,255,255,0.05)",
                    borderRight: i % 7 !== 6 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    backgroundColor: !isValid
                      ? "rgba(0,0,0,0.2)"
                      : isWeekend
                      ? "rgba(0,229,204,0.02)"
                      : "transparent",
                    cursor:    isValid && isAdmin ? "pointer" : "default",
                    minHeight: 100,
                  }}
                  className={`p-2 relative transition-colors ${isValid && isAdmin ? "hover:bg-white/2" : ""}`}
                >
                  {isValid && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          style={isToday
                            ? { backgroundColor: "#00E5CC", color: "#080F1E", width: 24, height: 24,
                                borderRadius: "50%", display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: 11, fontWeight: 700 }
                            : { color: isWeekend ? "#00E5CC" : "#9CA3AF", fontSize: 12, fontWeight: 500 }}
                        >
                          {dayNum}
                        </span>
                        {isAdmin && dayEvents.length === 0 && (
                          <Plus size={10} className="text-gray-700" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(ev => (
                          <EventDot key={ev.id} event={ev} onClick={setDetailModal} />
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-gray-600 text-xs pl-1">+{dayEvents.length - 3} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary strip */}
      {events.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {Object.entries(STATUS_CFG).map(([key, cfg]) => {
            const count = events.filter(e => e.status === key).length;
            const Icon  = cfg.icon;
            return (
              <div key={key}
                style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(255,255,255,0.07)" }}
                className="rounded-xl p-3 flex items-center gap-3">
                <div style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={15} />
                </div>
                <div>
                  <p style={{ color: cfg.color }} className="text-xl font-bold">{count}</p>
                  <p className="text-gray-500 text-xs">{cfg.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {createModal && isAdmin && (
        <EventModal
          date={createModal.date}
          coaches={coaches}
          kids={kids}
          onSave={handleSave}
          onClose={() => setCreateModal(null)}
        />
      )}

      {detailModal && !editModal && (
        <EventDetail
          event={detailModal}
          isAdmin={isAdmin}
          onEdit={(ev) => { setDetailModal(null); setEditModal(ev); }}
          onClose={() => setDetailModal(null)}
        />
      )}

      {editModal && isAdmin && (
        <EventModal
          event={editModal}
          coaches={coaches}
          kids={kids}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}