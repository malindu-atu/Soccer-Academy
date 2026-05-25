import { useEffect, useState } from "react";
import { UserPlus, ShieldCheck, X, Trash2, RefreshCw, Mail, User, Loader2 } from 'lucide-react';
import { getCoaches, createUser } from "../api";
import { useAuth } from "../context/AuthContext";
import { pageWrapper, card, input, btnPrimary, btnOutline, btnDanger } from "../components/UI";
import axios from "axios";

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api" });
api.interceptors.request.use(c => {
  const u = JSON.parse(localStorage.getItem("user"));
  if (u?.access_token) c.headers.Authorization = `Bearer ${u.access_token}`;
  return c;
});

const listUsers   = (token)          => api.get(`/auth/users?access_token=${token}`);
const deleteUser  = (userId, token)  => api.delete(`/auth/users/${userId}`, { data: { access_token: token, user_id: userId } });

const ROLE_CONFIG = {
  admin: { color: "#FCD34D", bg: "rgba(251,191,36,0.12)", label: "Admin" },
  coach: { color: "#00E5CC", bg: "rgba(0,229,204,0.12)",  label: "Coach" },
};

const EMPTY_FORM = {
  first_name: "", last_name: "", email: "",
  password: "", role: "coach", coach_id: "",
};

// ── Existing users list ───────────────────────────────────────────────────────
function UsersList({ accessToken, currentUserId, onRefresh }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [confirmId, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listUsers(accessToken);
      setUsers(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (userId) => {
    setDeleting(userId);
    try {
      await deleteUser(userId, accessToken);
      setUsers(u => u.filter(x => x.id !== userId));
      setConfirm(null);
      onRefresh?.();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to delete user");
    }
    setDeleting(null);
  };

  const isSelf = (id) => id === currentUserId;

  return (
    <div style={card} className="rounded-2xl overflow-hidden mb-6">
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        className="px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">Existing Accounts</p>
          <p className="text-gray-500 text-xs mt-0.5">{users.length} user{users.length !== 1 ? "s" : ""} total</p>
        </div>
        <button onClick={load}
          style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:text-white transition-all">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm p-10">
          <Loader2 size={15} className="animate-spin" style={{ color: "#00E5CC" }} /> Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="p-10 text-center">
          <User size={28} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500 text-sm">No users found</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {users.map(u => {
            const cfg      = ROLE_CONFIG[u.role] || ROLE_CONFIG.admin;
            const self     = isSelf(u.id);
            const isConfirm = confirmId === u.id;

            return (
              <div key={u.id}
                style={isConfirm ? { backgroundColor: "rgba(248,113,113,0.04)" } : {}}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors group">

                {/* Avatar */}
                <div style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {u.first_name?.charAt(0) || u.email?.charAt(0) || "?"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm">
                      {u.first_name && u.last_name
                        ? `${u.first_name} ${u.last_name}`
                        : u.email}
                    </p>
                    {self && (
                      <span style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#9CA3AF" }}
                        className="text-xs px-2 py-0.5 rounded-full">You</span>
                    )}
                    <span style={{ backgroundColor: cfg.bg, color: cfg.color }}
                      className="text-xs px-2 py-0.5 rounded-full font-semibold">{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-gray-500 text-xs">
                      <Mail size={10} /> {u.email}
                    </span>
                    {u.coaches?.name && (
                      <span className="text-gray-500 text-xs">
                        → {u.coaches.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete controls */}
                {!self && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isConfirm ? (
                      <>
                        <p className="text-xs text-red-400 hidden sm:block">Sure?</p>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deleting === u.id}
                          style={{ backgroundColor: "rgba(248,113,113,0.15)", color: "#F87171", border: "1px solid rgba(248,113,113,0.3)" }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500/25 transition-all disabled:opacity-50">
                          {deleting === u.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Trash2 size={11} />}
                          {deleting === u.id ? "Deleting…" : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirm(null)}
                          style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}
                          className="px-3 py-1.5 rounded-lg text-xs hover:text-white transition-all">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirm(u.id)}
                        style={{ color: "#F87171", border: "1px solid rgba(248,113,113,0.2)" }}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:bg-red-500/10 transition-all">
                        <Trash2 size={11} /> Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Users() {
  const { user }   = useAuth();
  const [coaches, setCoaches]   = useState([]);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [refreshKey, setRefresh] = useState(0);

  const currentUserId = user?.profile?.id;

  useEffect(() => {
    getCoaches().then(r => setCoaches(r.data)).catch(() => {});
  }, [refreshKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      setSaving(false);
      return;
    }
    if (form.role === "coach" && !form.coach_id) {
      setError("Please select which coach record to link this user to.");
      setSaving(false);
      return;
    }

    try {
      await createUser({
        access_token: user.access_token,
        email:        form.email,
        password:     form.password,
        first_name:   form.first_name,
        last_name:    form.last_name,
        role:         form.role,
        coach_id:     form.role === "coach" ? form.coach_id : null,
      });
      setSuccess(`✓ Account for ${form.first_name} ${form.last_name} created successfully.`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setRefresh(k => k + 1);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCoach = coaches.find(c => c.id === form.coach_id);

  return (
    <div style={pageWrapper} className="p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1 text-sm">Create and remove login accounts</p>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setError(""); setSuccess(""); }}
          style={showForm ? btnOutline : btnPrimary}
          className="px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-all whitespace-nowrap flex-shrink-0">
          {showForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {/* Success banner */}
      {success && (
        <div style={{ backgroundColor: "rgba(0,229,204,0.1)", border: "1px solid rgba(0,229,204,0.3)" }}
          className="rounded-xl p-4 mb-5 text-cyan-400 text-sm flex items-center justify-between gap-3">
          <span>{success}</span>
          <button onClick={() => setSuccess("")}><X size={14} /></button>
        </div>
      )}

      {/* Add user form */}
      {showForm && (
        <div style={card} className="rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-white mb-5">New User Account</h2>

          {error && (
            <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
              className="rounded-lg p-3 mb-4 text-red-400 text-sm flex items-center gap-2">
              <X size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Role selector */}
            <div className="mb-5">
              <label className="text-xs text-gray-400 mb-2 block">Role</label>
              <div className="flex gap-3">
                {["admin", "coach"].map(r => {
                  const cfg    = ROLE_CONFIG[r];
                  const active = form.role === r;
                  return (
                    <button key={r} type="button"
                      onClick={() => setForm(f => ({ ...f, role: r, coach_id: "" }))}
                      style={active
                        ? { backgroundColor: cfg.color, color: "#0A1628", border: `1px solid ${cfg.color}` }
                        : { backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
                      className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all">
                      {r === "admin" ? "Admin" : "Coach"}
                    </button>
                  );
                })}
              </div>
              <p className="text-gray-600 text-xs mt-2">
                {form.role === "admin"
                  ? "Full access to all pages and settings."
                  : "Coach portal and attendance only."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {[
                { label: "First Name", key: "first_name", placeholder: "First name" },
                { label: "Last Name",  key: "last_name",  placeholder: "Last name"  },
                { label: "Email",      key: "email",      placeholder: "user@fbl.lk", type: "email"    },
                { label: "Password",   key: "password",   placeholder: "Min. 6 characters", type: "password" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 mb-1.5 block">{f.label}</label>
                  <input style={input}
                    className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    placeholder={f.placeholder} type={f.type || "text"}
                    value={form[f.key]}
                    onChange={e => setForm(f2 => ({ ...f2, [f.key]: e.target.value }))} required />
                </div>
              ))}
            </div>

            {/* Coach link */}
            {form.role === "coach" && (
              <div className="mb-5">
                <label className="text-xs text-gray-400 mb-1.5 block">
                  Link to Coach Record <span className="text-red-400">*</span>
                </label>
                <select style={{ ...input, backgroundImage: "none" }}
                  className="w-full rounded-lg p-3 text-sm focus:outline-none"
                  value={form.coach_id}
                  onChange={e => setForm(f => ({ ...f, coach_id: e.target.value }))}>
                  <option value="" style={{ backgroundColor: "#0D1F3C" }}>— Select a coach —</option>
                  {coaches.map(c => (
                    <option key={c.id} value={c.id} style={{ backgroundColor: "#0D1F3C" }}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
                {selectedCoach && (
                  <div style={{ backgroundColor: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.15)" }}
                    className="mt-2 rounded-lg px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
                    <span style={{ color: "#00E5CC" }}>✓</span>
                    Linked to <span className="text-white font-medium">{selectedCoach.name}</span>
                    {selectedCoach.age_groups?.length > 0 && (
                      <span className="text-gray-500">· {selectedCoach.age_groups.join(", ")}</span>
                    )}
                  </div>
                )}
                {coaches.length === 0 && (
                  <p className="text-gray-600 text-xs mt-1">No coaches found. Add one in the Coaches page first.</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                style={saving ? { backgroundColor: "rgba(0,229,204,0.4)", color: "#0A1628" } : btnPrimary}
                className="px-8 py-3 rounded-lg font-semibold text-sm transition-all flex items-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? "Creating…" : "Create User"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError(""); }}
                style={btnOutline} className="px-5 py-3 rounded-lg text-sm font-semibold transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing users */}
      <UsersList
        key={refreshKey}
        accessToken={user?.access_token}
        currentUserId={currentUserId}
        onRefresh={() => setRefresh(k => k + 1)}
      />

      {/* Info card */}
      <div style={card} className="rounded-2xl p-5">
        <p className="text-gray-500 text-xs">
          💡 Deleting a user removes their login account and profile. Their coach record, sessions, and attendance data are <span className="text-gray-300">not</span> affected. To fully remove a coach, also delete them from the <span className="text-gray-300">Coaches</span> page.
        </p>
      </div>
    </div>
  );
}