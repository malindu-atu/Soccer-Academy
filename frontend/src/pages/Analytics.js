import { useEffect, useState } from "react";
import {
  getStudentAnalytics, getCoachAnalytics, getLocationAnalytics,
  getRetentionAnalytics, getKids, getCoaches, getLocations
} from "../api";
import { pageWrapper, card, input } from "../components/UI";
import StudentFilter from "../components/StudentFilter";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  User, GraduationCap, MapPin, RefreshCw, TrendingUp,
  CheckCircle2, LayoutGrid, Clock, Target, Timer, X,
  ChevronDown, Loader2
} from "lucide-react";

const COLORS = ["#00E5CC", "#4DFFD2", "#00C4AE", "#FCD34D", "#F87171", "#A78BFA"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.3)" }}
        className="rounded-lg p-3 text-sm">
        <p style={{ color: "#00E5CC" }} className="font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || "white" }}>{p.name}: <span className="font-bold">{p.value}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard = ({ value, label, color, sub }) => (
  <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }}
    className="rounded-xl p-4 text-center">
    <p style={{ color: color || "#00E5CC" }} className="text-3xl font-bold">{value}</p>
    <p className="text-gray-400 text-xs mt-1">{label}</p>
    {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
  </div>
);

const RateBar = ({ label, value }) => {
  const pct = Math.min(value, 100);
  const color = value >= 80 ? "#00E5CC" : value >= 50 ? "#FCD34D" : "#F87171";
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span style={{ color }} className="font-semibold">{value}%</span>
      </div>
      <div style={{ backgroundColor: "rgba(255,255,255,0.06)" }} className="rounded-full h-1.5">
        <div style={{ width: `${pct}%`, backgroundColor: color, transition: "width 0.6s ease" }}
          className="h-1.5 rounded-full" />
      </div>
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-1">
      <Icon size={22} style={{ color: "#00E5CC" }} strokeWidth={1.75} />
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
    {subtitle && <p className="text-gray-400 text-sm ml-9">{subtitle}</p>}
  </div>
);

function PlayerAnalytics({ kids, locations }) {
  const [selectedId, setSelectedId] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = kids.filter(k => {
    const matchesSearch = k.name.toLowerCase().includes(search.toLowerCase());
    const matchesAge = ageFilter ? k.age_group === ageFilter : true;
    return matchesSearch && matchesAge;
  });

  const selectedPlayer = kids.find(k => k.id === selectedId);

  const load = async (id) => {
    if (!id) return setStats(null);
    setLoading(true);
    try {
      const res = await getStudentAnalytics(id);
      setStats(res.data);
    } catch(e) {}
    setLoading(false);
  };

  const selectPlayer = (k) => {
    setSelectedId(k.id);
    setSearch(k.name);
    setShowDropdown(false);
    load(k.id);
  };

  const clearSelection = () => {
    setSelectedId("");
    setSearch("");
    setStats(null);
    setShowDropdown(false);
  };

  const rateColor = (r) => r >= 80 ? "#00E5CC" : r >= 50 ? "#FCD34D" : "#F87171";

  return (
    <div>
      <SectionHeader icon={User} title="Player Analytics"
        subtitle="Search by name or filter by age group to find a player" />

      <div className="mb-4">
        <StudentFilter
          search={search}
          onSearch={v => { setSearch(v); setShowDropdown(!!v); if (!v) clearSelection(); }}
          ageFilter={ageFilter} onAge={setAgeFilter}
          locationFilter={locationFilter} onLocation={setLocationFilter}
          locations={locations}
          resultCount={(search || ageFilter) && !selectedId ? filtered.length : undefined}
        />
      </div>

      {/* Player search dropdown */}
      <div className="relative mb-6">
        <div className="relative max-w-sm">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input style={{ ...input }}
            className="w-full rounded-lg pl-9 pr-9 py-3 text-sm focus:outline-none"
            placeholder="Select a player…"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) clearSelection(); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)} />
          {search && (
            <button onClick={clearSelection} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
        {showDropdown && (
          <div style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.2)", top: "calc(100% + 4px)" }}
            className="absolute left-0 max-w-sm rounded-xl overflow-hidden z-10 shadow-xl max-h-56 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-gray-500 text-sm p-4 text-center">No players found</p>
              : filtered.map(k => (
                <button key={k.id} onMouseDown={() => selectPlayer(k)}
                  style={k.id === selectedId ? { backgroundColor: "rgba(0,229,204,0.1)" } : {}}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 text-left transition-colors">
                  <span className="text-white text-sm">{k.name}</span>
                  <span style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }} className="text-xs px-2 py-0.5 rounded-full">{k.age_group}</span>
                </button>
              ))}
          </div>
        )}
        {selectedPlayer && (
          <div style={{ backgroundColor: "rgba(0,229,204,0.08)", border: "1px solid rgba(0,229,204,0.3)" }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm mt-2">
            <CheckCircle2 size={13} style={{ color: "#00E5CC" }} />
            <span className="text-white">{selectedPlayer.name}</span>
            <span style={{ color: "#00E5CC" }} className="text-xs">{selectedPlayer.age_group}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 size={14} style={{ color: "#00E5CC" }} className="animate-spin" />
          Loading...
        </div>
      )}

      {stats && !loading && (
        <div>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <StatCard value={`${stats.attendance_rate}%`} label="Attendance Rate" color={rateColor(stats.attendance_rate)} />
            <StatCard value={stats.total_sessions} label="Total Sessions" color="#9CA3AF" />
            <StatCard value={stats.present} label="Present" color="#00E5CC" />
            <StatCard value={stats.absent || 0} label="Absent" color="#F87171" />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Monthly Attendance Trend</p>
              {stats.monthly_trend && stats.monthly_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={stats.monthly_trend}>
                    <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="present" stroke="#00E5CC" strokeWidth={2} dot={{ fill: "#00E5CC", r: 3 }} name="Present" />
                    <Line type="monotone" dataKey="absent" stroke="#F87171" strokeWidth={2} dot={{ fill: "#F87171", r: 3 }} name="Absent" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">Not enough data yet</p>
              )}
            </div>

            <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Status Breakdown</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                <Pie
                    data={[
                      { name: "Present", value: stats.present },
                      { name: "Absent", value: stats.absent || 0 }
                    ]}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    <Cell fill="#00E5CC" />
                    <Cell fill="#F87171" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ color: "#9CA3AF", fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {stats.age_group_breakdown && stats.age_group_breakdown.length > 0 && (
            <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5 mb-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Attendance Rate by Age Group Session</p>
              {stats.age_group_breakdown.map(ag => (
                <RateBar key={ag.age_group} label={`${ag.age_group} (${ag.total} sessions)`} value={ag.rate} />
              ))}
            </div>
          )}

          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Recent Session Log</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {stats.records.slice(0, 10).map(r => (
                <div key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  className="flex justify-between items-center py-2 last:border-0">
                  <span className="text-gray-400 text-xs">{r.sessions?.date || "—"}</span>
                  <span className="text-gray-500 text-xs">{r.sessions?.age_group || ""}</span>
                  <span style={r.status === "present"
                    ? { color: "#00E5CC", backgroundColor: "rgba(0,229,204,0.1)" }
                    : r.status === "late"
                    ? { color: "#FCD34D", backgroundColor: "rgba(251,191,36,0.1)" }
                    : { color: "#F87171", backgroundColor: "rgba(239,68,68,0.1)" }}
                    className="text-xs px-2 py-0.5 rounded-full capitalize">{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!stats && !loading && (
        <div style={{ backgroundColor: "#0A1628" }} className="rounded-xl p-12 text-center">
          <User size={32} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500 text-sm">Select a player above to view their analytics</p>
        </div>
      )}
    </div>
  );
}

function CoachAnalytics({ coaches }) {
  const [selectedId, setSelectedId] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (id) => {
    if (!id) return setStats(null);
    setLoading(true);
    try {
      const res = await getCoachAnalytics(id);
      setStats(res.data);
    } catch(e) {}
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader icon={GraduationCap} title="Coach Analytics"
        subtitle="Evaluate coach performance, session delivery, and player engagement" />
      <div className="mb-6">
        <select style={{ ...input, backgroundImage: "none" }}
          className="w-full max-w-sm rounded-lg p-3 text-sm focus:outline-none"
          value={selectedId}
          onChange={e => { setSelectedId(e.target.value); load(e.target.value); }}>
          <option value="" style={{ backgroundColor: "#0D1F3C" }}>Select a coach...</option>
          {coaches.map(c => (
            <option key={c.id} value={c.id} style={{ backgroundColor: "#0D1F3C" }}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 size={14} style={{ color: "#00E5CC" }} className="animate-spin" />
          Loading...
        </div>
      )}

      {stats && !loading && (
        <div>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <StatCard value={stats.total_assigned} label="Total Sessions" color="#9CA3AF" />
            <StatCard value={stats.completed} label="Completed" color="#00E5CC" />
            <StatCard value={`${stats.completion_rate}%`} label="Completion Rate"
              color={stats.completion_rate >= 80 ? "#00E5CC" : stats.completion_rate >= 50 ? "#FCD34D" : "#F87171"} />
            <StatCard value={`${stats.avg_player_attendance_rate}%`} label="Player Attendance" color="#4DFFD2" sub="under this coach" />
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Session Status</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Completed", value: stats.completed },
                      { name: "Scheduled", value: stats.scheduled || 0 },
                      { name: "Cancelled", value: stats.cancelled || 0 }
                    ].filter(d => d.value > 0)}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    <Cell fill="#00E5CC" />
                    <Cell fill="#FCD34D" />
                    <Cell fill="#F87171" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ color: "#9CA3AF", fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Sessions by Age Group</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.age_group_breakdown} layout="vertical">
                  <XAxis type="number" tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} />
                  <YAxis type="category" dataKey="age_group" tick={{ fill: "#9CA3AF", fontSize: 11 }} tickLine={false} width={35} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="sessions" fill="#00E5CC" radius={[0, 4, 4, 0]} name="Sessions" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Monthly Sessions</p>
              {stats.monthly_sessions && stats.monthly_sessions.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.monthly_sessions}>
                    <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 9 }} tickLine={false} />
                    <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="sessions" fill="#4DFFD2" radius={[4, 4, 0, 0]} name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">No data yet</p>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Key Performance Rates</p>
            <RateBar label="Session Completion Rate" value={stats.completion_rate} />
            <RateBar label="Player Attendance Under This Coach" value={stats.avg_player_attendance_rate} />
          </div>
        </div>
      )}

      {!stats && !loading && (
        <div style={{ backgroundColor: "#0A1628" }} className="rounded-xl p-12 text-center">
          <GraduationCap size={32} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500 text-sm">Select a coach above to view their analytics</p>
        </div>
      )}
    </div>
  );
}

function LocationAnalytics() {
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocationAnalytics().then(r => {
      setLocations(r.data);
      if (r.data.length > 0) setSelected(r.data[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loc = selected;

  return (
    <div>
      <SectionHeader icon={MapPin} title="Location Analytics"
        subtitle="Compare venue utilization, session frequency, and age group distribution" />

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-6">
          <Loader2 size={14} style={{ color: "#00E5CC" }} className="animate-spin" />
          Loading locations...
        </div>
      )}

      {!loading && locations.length === 0 && (
        <div style={{ backgroundColor: "#0A1628" }} className="rounded-xl p-12 text-center">
          <MapPin size={32} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500 text-sm">No location data found. Add a location field to your sessions.</p>
        </div>
      )}

      {!loading && locations.length > 0 && (
        <div>
          <div className="flex gap-2 flex-wrap mb-6">
            {locations.map(l => (
              <button key={l.location} onClick={() => setSelected(l)}
                style={selected?.location === l.location
                  ? { backgroundColor: "#00E5CC", color: "#0A1628" }
                  : { backgroundColor: "rgba(0,229,204,0.08)", color: "#00E5CC", border: "1px solid rgba(0,229,204,0.3)" }}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all">
                {l.location}
              </button>
            ))}
          </div>

          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5 mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">All Locations — Total vs Completed Sessions</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={locations.map(l => ({ location: l.location, Total: l.total_sessions, Completed: l.completed }))}>
                <XAxis dataKey="location" tick={{ fill: "#9CA3AF", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Total" fill="rgba(0,229,204,0.2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completed" fill="#00E5CC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {loc && (
            <div>
              <p className="text-white font-semibold mb-4">
                Deep Dive: <span style={{ color: "#00E5CC" }}>{loc.location}</span>
              </p>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <StatCard value={loc.total_sessions} label="Total Sessions" color="#9CA3AF" />
                <StatCard value={loc.completed} label="Completed" color="#00E5CC" />
                <StatCard value={loc.cancelled} label="Cancelled" color="#F87171" />
                <StatCard value={`${loc.utilization_rate}%`} label="Utilization Rate"
                  color={loc.utilization_rate >= 80 ? "#00E5CC" : loc.utilization_rate >= 50 ? "#FCD34D" : "#F87171"} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Sessions by Age Group</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={loc.age_group_breakdown.map(a => ({ name: a.age_group, value: a.count }))}
                        cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={3}>
                        {loc.age_group_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8}
                        formatter={(v) => <span style={{ color: "#9CA3AF", fontSize: 11 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Monthly Session Trend</p>
                  {loc.monthly_trend && loc.monthly_trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={loc.monthly_trend}>
                        <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 9 }} tickLine={false} />
                        <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="sessions" stroke="#00E5CC" strokeWidth={2} dot={{ fill: "#00E5CC", r: 3 }} name="Sessions" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-8">No trend data yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CrossCuttingMetrics() {
  const [retention, setRetention] = useState(null);

  useEffect(() => {
    getRetentionAnalytics().then(r => setRetention(r.data)).catch(() => {});
  }, []);

  const metricsRef = [
    { icon: TrendingUp,    metric: "Attendance Rate",       target: "≥ 80%",  color: "#00E5CC", desc: "Sessions attended vs scheduled" },
    { icon: CheckCircle2,  metric: "Session Consistency",   target: "≥ 85%",  color: "#00E5CC", desc: "Sessions held vs scheduled" },
    { icon: GraduationCap, metric: "Coach Completion Rate", target: "≥ 90%",  color: "#00E5CC", desc: "Completed sessions per coach" },
    { icon: MapPin,        metric: "Location Utilization",  target: "≥ 75%",  color: "#FCD34D", desc: "Completed vs total at venue" },
    { icon: RefreshCw,     metric: "Age Group Retention",   target: "≥ 70%",  color: "#00E5CC", desc: "Players staying active" },
    { icon: Timer,         metric: "Punctuality Rate",      target: "≥ 90%",  color: "#FCD34D", desc: "Present vs present + late" },
  ];

  return (
    <div>
      <SectionHeader icon={RefreshCw} title="Academy Overview"
        subtitle="Academy-wide trends spanning players, coaches, and locations" />

      {retention && (
        <div className="grid grid-cols-2 gap-6">
          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Age Group Retention Funnel</p>
            <p className="text-gray-500 text-xs mb-4">Active players across age groups — shows progression through the academy</p>
            <div className="space-y-3">
              {retention.funnel.map((item, i) => {
                const maxVal = Math.max(...retention.funnel.map(f => f.active), 1);
                const pct = (item.active / maxVal) * 100;
                return (
                  <div key={item.age_group}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 font-medium">{item.age_group}</span>
                      <span style={{ color: COLORS[i] }} className="font-bold">{item.active} players</span>
                    </div>
                    <div style={{ backgroundColor: "rgba(255,255,255,0.06)" }} className="rounded-full h-3">
                      <div style={{ width: `${pct}%`, backgroundColor: COLORS[i], transition: "width 0.8s ease" }} className="h-3 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 flex justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p style={{ color: "#00E5CC" }} className="text-xl font-bold">{retention.total_active}</p>
                <p className="text-gray-400 text-xs">Active Players</p>
              </div>
              <div>
                <p style={{ color: "#F87171" }} className="text-xl font-bold">{retention.total_inactive}</p>
                <p className="text-gray-400 text-xs">Inactive / Left</p>
              </div>
              <div>
                <p style={{ color: "#FCD34D" }} className="text-xl font-bold">
                  {retention.total_active + retention.total_inactive > 0
                    ? Math.round((retention.total_active / (retention.total_active + retention.total_inactive)) * 100)
                    : 0}%
                </p>
                <p className="text-gray-400 text-xs">Retention Rate</p>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Metrics Quick Reference</p>
            <div className="space-y-3">
              {metricsRef.map(({ icon: Icon, metric, target, color, desc }) => (
                <div key={metric} className="flex items-start gap-3">
                  <Icon size={16} style={{ color }} className="mt-0.5 shrink-0" strokeWidth={1.75} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-white text-sm font-medium">{metric}</span>
                      <span style={{ color, backgroundColor: `${color}15` }}
                        className="text-xs px-2 py-0.5 rounded-full font-semibold">{target}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!retention && (
        <div style={{ backgroundColor: "#0A1628" }} className="rounded-xl p-12 text-center">
          <Loader2 size={28} style={{ color: "#00E5CC" }} className="animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading academy overview...</p>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "player",   label: "Player",           icon: User },
  { id: "coach",    label: "Coach",            icon: GraduationCap },
  { id: "location", label: "Location",         icon: MapPin },
  { id: "cross",    label: "Academy Overview", icon: LayoutGrid },
];

export default function Analytics() {
  const [tab, setTab] = useState("player");
  const [kids, setKids] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    getKids().then(r => setKids(r.data)).catch(() => {});
    getCoaches().then(r => setCoaches(r.data)).catch(() => {});
    getLocations().then(r => setLocations(r.data)).catch(() => {});
  }, []);

  return (
    <div style={pageWrapper} className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1">Track performance across players, coaches, and locations</p>
      </div>

      <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }}
        className="flex rounded-xl p-1 mb-8 w-fit gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={tab === id
              ? { backgroundColor: "#00E5CC", color: "#0A1628" }
              : { color: "#9CA3AF" }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all">
            <Icon size={14} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      <div style={card} className="rounded-2xl p-8">
        {tab === "player"   && <PlayerAnalytics kids={kids} locations={locations} />}
        {tab === "coach"    && <CoachAnalytics coaches={coaches} />}
        {tab === "location" && <LocationAnalytics />}
        {tab === "cross"    && <CrossCuttingMetrics />}
      </div>
    </div>
  );
}