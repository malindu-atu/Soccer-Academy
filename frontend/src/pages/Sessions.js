import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2, UserCheck, Users, ChevronRight, Clock, Calendar } from 'lucide-react';
import { getCoaches, getKids } from "../api";
import { pageWrapper, card, input, btnPrimary, btnOutline } from "../components/UI";
import axios from "axios";

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api" });
api.interceptors.request.use(c => {
  const u = JSON.parse(localStorage.getItem("user"));
  if (u?.access_token) c.headers.Authorization = `Bearer ${u.access_token}`;
  return c;
});

const getLocations      = ()       => api.get("/locations");
const createLocation    = (d)      => api.post("/locations", d);
const deleteLocation    = (id)     => api.delete(`/locations/${id}`);
const createTemplate    = (d)      => api.post("/sessions/templates", d);
const updateTemplate    = (id, d)  => api.put(`/sessions/templates/${id}`, d);
const deleteTemplate    = (id)     => api.delete(`/sessions/templates/${id}`);
const updateEnrollments = (id, ks) => api.put(`/sessions/templates/${id}/enrollments`, { kid_ids: ks });

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const AGE_GROUPS = ["U7", "U13", "U12_DEV", "U13_GIRLS"];
const AGE_GROUP_LABELS = { U7: "U7", U13: "U13", U12_DEV: "U12 Development", U13_GIRLS: "U13 Girls" };

const DAY_COLORS = {
  Monday:    "#00E5CC", Tuesday:  "#4DFFD2", Wednesday: "#FCD34D",
  Thursday:  "#F87171", Friday:   "#A78BFA", Saturday:  "#60A5FA", Sunday: "#FB923C",
};

// ── Small components ────────────────────────────────────────────────────────

function SessionRow({ t, coaches, onAssignCoach, onDelete, onManageStudents }) {
  const [editing, setEditing] = useState(false);
  const [coachId, setCoachId] = useState(t.coach_id || "");

  const save = async () => {
    await onAssignCoach(t.id, coachId);
    setEditing(false);
  };

  return (
    <div style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      className="rounded-xl p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ backgroundColor: `${DAY_COLORS[t.day_of_week]}20`, color: DAY_COLORS[t.day_of_week] }}
            className="px-2 py-0.5 rounded-full text-xs font-semibold">{t.day_of_week}</span>
          <span style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
            className="px-2 py-0.5 rounded-full text-xs">{t.age_group}</span>
          <span className="text-gray-400 text-xs">{t.start_time} – {t.end_time}</span>
          <span className="text-gray-500 text-xs">· {t.session_enrollments?.length || 0} students</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onManageStudents(t)}
            style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}
            className="px-2 py-1 rounded-lg text-xs hover:text-white hover:border-white/20 transition-all">
            Students
          </button>
          <button onClick={() => setEditing(e => !e)}
            style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}
            className="px-2 py-1 rounded-lg text-xs hover:text-white hover:border-white/20 transition-all">
            {t.coaches?.name || "Assign Coach"}
          </button>
          <button onClick={() => onDelete(t.id)}
            style={{ color: "#F87171" }}
            className="px-2 py-1 rounded-lg text-xs hover:bg-red-500/10 transition-all">✕</button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 flex items-center gap-2">
          <select style={{ ...input, backgroundImage: "none" }}
            className="flex-1 rounded-lg p-2 text-sm focus:outline-none"
            value={coachId} onChange={e => setCoachId(e.target.value)}>
            <option value="" style={{ backgroundColor: "#0D1F3C" }}>— No coach —</option>
            {coaches.map(c => <option key={c.id} value={c.id} style={{ backgroundColor: "#0D1F3C" }}>{c.name}</option>)}
          </select>
          <button onClick={save} style={btnPrimary}
            className="px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-all">Save</button>
          <button onClick={() => setEditing(false)}
            style={btnOutline} className="px-3 py-2 rounded-lg text-xs transition-all">Cancel</button>
        </div>
      )}
    </div>
  );
}

// ── Location tile (expanded view) ──────────────────────────────────────────

function LocationTile({ loc, coaches, allKids, onRefresh, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [form, setForm] = useState({ day_of_week: "Monday", start_time: "", end_time: "", age_group: "U7", coach_id: "" });
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [selectedKids, setSelectedKids] = useState([]);

  const templates = loc.session_templates || [];
  const totalStudents = templates.reduce((sum, t) => sum + (t.session_enrollments?.length || 0), 0);

  const handleAddSession = async (e) => {
    e.preventDefault();
    await createTemplate({ ...form, location_id: loc.id, coach_id: form.coach_id || null });
    setForm({ day_of_week: "Monday", start_time: "", end_time: "", age_group: "U7", coach_id: "" });
    setShowAddSession(false);
    onRefresh();
  };

  const handleAssignCoach = async (templateId, coachId) => {
    await updateTemplate(templateId, { coach_id: coachId || null });
    onRefresh();
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Remove this session?")) return;
    await deleteTemplate(templateId);
    onRefresh();
  };

  const openEnroll = (t) => {
    setEnrollTarget(t);
    const existing = t.session_enrollments?.map(e => e.kid_id) || [];
    if (existing.length > 0) {
      // Use saved enrollments
      setSelectedKids(existing);
    } else {
      // Auto-select all kids at this location with matching age group
      const autoSelected = allKids
        .filter(k => k.age_group === t.age_group && k.location_id === loc.id)
        .map(k => k.id);
      setSelectedKids(autoSelected);
    }
  };

  const saveEnroll = async () => {
    await updateEnrollments(enrollTarget.id, selectedKids);
    setEnrollTarget(null);
    onRefresh();
  };

  const toggleKid = (id) => setSelectedKids(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const eligibleKids = enrollTarget
    ? allKids.filter(k => k.age_group === enrollTarget.age_group && k.location_id === loc.id)
    : [];

  // Sort templates by day order
  const sortedTemplates = [...templates].sort((a, b) =>
    DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week)
  );

  return (
    <>
      <div style={{ ...card, cursor: "pointer" }}
        className="rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all">
        {/* Tile header — always visible */}
        <div className="p-5" onClick={() => setExpanded(e => !e)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
            <div style={{ backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
  <MapPin size={22} strokeWidth={1.8} />
</div>
              <div>
                <h3 className="text-white font-semibold text-base">{loc.name}</h3>
                {loc.address && <p className="text-gray-500 text-xs mt-0.5">{loc.address}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p style={{ color: "#00E5CC" }} className="text-lg font-bold">{templates.length}</p>
                <p className="text-gray-500 text-xs">sessions/wk</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-white text-lg font-bold">{totalStudents}</p>
                <p className="text-gray-500 text-xs">students</p>
              </div>
              <span style={{ color: expanded ? "#00E5CC" : "#6B7280", transform: expanded ? "rotate(180deg)" : "none", display: "inline-block" }}
                className="text-lg transition-transform">
                ›
              </span>
            </div>
          </div>

          {/* Day pills preview */}
          {!expanded && templates.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {sortedTemplates.map(t => (
                <span key={t.id}
                  style={{ backgroundColor: `${DAY_COLORS[t.day_of_week]}18`, color: DAY_COLORS[t.day_of_week] }}
                  className="px-2 py-0.5 rounded-full text-xs font-medium">
                  {t.day_of_week.slice(0,3)} {t.age_group}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} className="p-5">
            {/* Session list */}
            {sortedTemplates.length === 0 && !showAddSession && (
              <p className="text-gray-600 text-sm mb-4">No sessions yet for this location.</p>
            )}
            <div className="space-y-2 mb-4">
              {sortedTemplates.map(t => (
                <SessionRow key={t.id} t={t} coaches={coaches}
                  onAssignCoach={handleAssignCoach}
                  onDelete={handleDeleteTemplate}
                  onManageStudents={openEnroll} />
              ))}
            </div>

            {/* Add session form */}
            {showAddSession ? (
              <form onSubmit={handleAddSession}
                style={{ backgroundColor: "rgba(0,229,204,0.04)", border: "1px solid rgba(0,229,204,0.15)" }}
                className="rounded-xl p-4">
                <p className="text-white text-sm font-semibold mb-3">New Fixed Session</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Day</label>
                    <select style={{ ...input, backgroundImage: "none" }}
                      className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                      value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
                      {DAYS.map(d => <option key={d} style={{ backgroundColor: "#0D1F3C" }}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Start</label>
                    <input style={input} type="time"
                      className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                      value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">End</label>
                    <input style={input} type="time"
                      className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                      value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Age Group</label>
                    <select style={{ ...input, backgroundImage: "none" }}
                      className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                      value={form.age_group} onChange={e => setForm(f => ({ ...f, age_group: e.target.value }))}>
                      {AGE_GROUPS.map(g => <option key={g} value={g} style={{ backgroundColor: "#0D1F3C" }}>{AGE_GROUP_LABELS[g]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Coach</label>
                    <select style={{ ...input, backgroundImage: "none" }}
                      className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                      value={form.coach_id} onChange={e => setForm(f => ({ ...f, coach_id: e.target.value }))}>
                      <option value="" style={{ backgroundColor: "#0D1F3C" }}>— Assign later —</option>
                      {coaches.map(c => <option key={c.id} value={c.id} style={{ backgroundColor: "#0D1F3C" }}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" style={btnPrimary}
                    className="px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all">
                    Add Session
                  </button>
                  <button type="button" onClick={() => setShowAddSession(false)} style={btnOutline}
                    className="px-4 py-2 rounded-lg text-sm transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowAddSession(true)} style={btnOutline}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all">
                + Add Session to this Location
              </button>
            )}

            {/* Remove location — only shown when expanded */}
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button onClick={() => onDelete(loc.id)}
                style={{ color: "#F87171", border: "1px solid rgba(248,113,113,0.2)" }}
                className="px-3 py-1.5 rounded-lg text-xs hover:bg-red-500/10 transition-all">
                Remove Location
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enroll students modal */}
      {enrollTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => setEnrollTarget(null)}>
          <div style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.25)", maxWidth: 440, width: "100%" }}
            className="rounded-2xl p-6 shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-white font-semibold">Enrolled Students</h2>
              <span style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
                className="px-2 py-0.5 rounded-full text-xs">{selectedKids.length} selected</span>
            </div>
            <p className="text-gray-500 text-xs mb-4">
              {loc.name} · {enrollTarget.day_of_week} {enrollTarget.age_group} · {eligibleKids.length} eligible students
            </p>
            <div className="overflow-y-auto flex-1 space-y-1.5 mb-4">
              {eligibleKids.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-6">No {enrollTarget.age_group} students found.</p>
              )}
              {eligibleKids.map(k => {
                const sel = selectedKids.includes(k.id);
                return (
                  <button key={k.id} onClick={() => toggleKid(k.id)}
                    style={sel
                      ? { backgroundColor: "rgba(0,229,204,0.12)", border: "1px solid rgba(0,229,204,0.4)" }
                      : { backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left">
                    <div style={sel
                        ? { backgroundColor: "#00E5CC", color: "#0A1628" }
                        : { backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {sel ? "✓" : k.name.charAt(0)}
                    </div>
                    <span className="text-white text-sm">{k.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={saveEnroll} style={btnPrimary}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-all">Save</button>
              <button onClick={() => setEnrollTarget(null)} style={btnOutline}
                className="px-5 py-2.5 rounded-lg text-sm transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function Sessions() {
  const [locations, setLocations] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [allKids, setAllKids] = useState([]);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [locForm, setLocForm] = useState({ name: "", address: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [locsRes, coachesRes, kidsRes] = await Promise.all([
      getLocations(), getCoaches(), getKids()
    ]);
    setLocations(locsRes.data);
    setCoaches(coachesRes.data);
    setAllKids(kidsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAddLocation = async (e) => {
    e.preventDefault();
    await createLocation({ name: locForm.name, address: locForm.address || null });
    setLocForm({ name: "", address: "" });
    setShowAddLocation(false);
    load();
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm("Remove this location and all its sessions?")) return;
    await deleteLocation(id);
    load();
  };

  return (
    <div style={pageWrapper} className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Sessions</h1>
          <p className="text-gray-400 mt-1 text-sm">Tap a location to manage its fixed weekly sessions</p>
        </div>
        <button onClick={() => setShowAddLocation(f => !f)} style={btnPrimary}
          className="px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-all whitespace-nowrap">
          {showAddLocation ? "Cancel" : "Add Location"}
        </button>
      </div>

      {/* Add location form */}
      {showAddLocation && (
        <div style={card} className="rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-white mb-4">New Location</h2>
          <form onSubmit={handleAddLocation} className="flex flex-col sm:flex-row gap-3">
            <input style={input} className="flex-1 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="Location name (e.g. Colombo Ground)" value={locForm.name}
              onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} required />
            <input style={input} className="flex-1 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="Address (optional)" value={locForm.address}
              onChange={e => setLocForm(f => ({ ...f, address: e.target.value }))} />
            <button type="submit" style={btnPrimary}
              className="px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-all whitespace-nowrap">
              Add Location
            </button>
          </form>
        </div>
      )}

      {/* Location tiles */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <div style={{ borderColor: "#00E5CC" }} className="animate-spin rounded-full h-4 w-4 border-b-2" />
          Loading…
        </div>
      )}

      {!loading && locations.length === 0 && (
        <div style={card} className="rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📍</p>
          <p className="text-white font-semibold">No locations yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first training location above.</p>
        </div>
      )}

      <div className="space-y-4">
        {locations.map(loc => (
          <LocationTile
            key={loc.id}
            loc={loc}
            coaches={coaches}
            allKids={allKids}
            onRefresh={load}
            onDelete={handleDeleteLocation}
          />
        ))}
      </div>
    </div>
  );
}