import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, X,
  TrendingUp, TrendingDown, DollarSign, MapPin,
  Users, Loader2, Check, AlertCircle, Pencil, RefreshCw
} from "lucide-react";
import { pageWrapper, card, input, btnPrimary, btnOutline } from "../components/UI";
import StudentFilter from "../components/StudentFilter";
import axios from "axios";

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api" });
api.interceptors.request.use(c => {
  const u = JSON.parse(localStorage.getItem("user"));
  if (u?.access_token) c.headers.Authorization = `Bearer ${u.access_token}`;
  return c;
});

const getLocations       = ()               => api.get("/locations/");
const getCoaches         = ()               => api.get("/coaches/");
const getSummary         = (m)              => api.get(`/finance/summary/${m}`);
const getRates           = ()               => api.get("/finance/rates");
const updateRate         = (ag, d)          => api.put(`/finance/rates/${ag}`, d);
const getPayments        = (m, params = {}) => api.get(`/finance/payments?month=${m}`, { params });
const upsertPayment      = (d)              => api.post("/finance/payments", d);
const getOtherIncome     = (m)              => api.get(`/finance/other-income?month=${m}`);
const createOtherIncome  = (d)              => api.post("/finance/other-income", d);
const deleteOtherIncome  = (id)             => api.delete(`/finance/other-income/${id}`);
const getExpenses        = (m)              => api.get(`/finance/expenses?month=${m}`);
const createExpense      = (d)              => api.post("/finance/expenses", d);
const deleteExpense      = (id)             => api.delete(`/finance/expenses/${id}`);
const getSalaries        = (m)              => api.get(`/finance/salaries?month=${m}`);
const createSalary       = (d)              => api.post("/finance/salaries", d);
const deleteSalary       = (id)             => api.delete(`/finance/salaries/${id}`);

const AGE_GROUP_LABELS = {
  U7: "U7", U13: "U13", U12_DEV: "U12 Development", U13_GIRLS: "U13 Girls",
};

const OTHER_INCOME_LABELS = {
  fbl_private_events:    "FBL Private Events",
  montessori_payments:   "Montessori Payments",
  kit_payments:          "Kit Payments",
  registration_payments: "Registration Payments",
  sponsors:              "Sponsors",
  other_payments:        "Other Payments",
  academy_events:        "Academy Events",
  tournament_payments:   "Tournament Payments",
};

const OTHER_INCOME_OPTIONS = [
  { value: "fbl_private_events",    label: "FBL Private Events" },
  { value: "montessori_payments",   label: "Montessori Payments" },
  { value: "kit_payments",          label: "Kit Payments" },
  { value: "registration_payments", label: "Registration Payments" },
  { value: "sponsors",              label: "Sponsors" },
  { value: "other_payments",        label: "Other Payments" },
  { value: "academy_events",        label: "Academy Events" },
  { value: "tournament_payments",   label: "Tournament Payments" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function toMonthStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatMonth(m) {
  const [y, mo] = m.split("-");
  return new Date(y, mo - 1).toLocaleString("default", { month: "long", year: "numeric" });
}
function fmt(n) {
  return `LKR ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_CFG = {
  paid:   { color: "#00E5CC", bg: "rgba(0,229,204,0.12)",  label: "Paid",   icon: "✓" },
  unpaid: { color: "#F87171", bg: "rgba(239,68,68,0.12)",  label: "Unpaid", icon: "✕" },
};

// ── Month navigator ───────────────────────────────────────────────────────────
function MonthNav({ month, onChange }) {
  const prev = () => {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() - 1);
    onChange(toMonthStr(d));
  };
  const next = () => {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() + 1);
    onChange(toMonthStr(d));
  };
  return (
    <div className="flex items-center gap-2">
      <button onClick={prev}
        style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.2)", color: "#00E5CC" }}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-cyan-500/10 transition-all">
        <ChevronLeft size={14} />
      </button>
      <div style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.2)" }}
        className="px-4 py-1.5 rounded-lg min-w-[150px] text-center">
        <span className="text-white font-semibold text-sm">{formatMonth(month)}</span>
      </div>
      <button onClick={next}
        style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.2)", color: "#00E5CC" }}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-cyan-500/10 transition-all">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status, onClick, saving, disabled }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.unpaid;
  return (
    <button onClick={onClick} disabled={saving || disabled}
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, minWidth: 80 }}
      className="px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80 flex items-center gap-1.5 justify-center disabled:opacity-50">
      <span>{cfg.icon}</span>
      {saving ? "..." : cfg.label}
    </button>
  );
}

// ── Summary cards ─────────────────────────────────────────────────────────────
function SummaryCards({ summary }) {
  if (!summary) return null;
  const net = summary.net;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Total Income",   value: fmt(summary.total_income),   color: "#00E5CC", icon: TrendingUp   },
        { label: "Student Fees",   value: fmt(summary.student_income), color: "#4DFFD2", icon: Users        },
        { label: "Total Expenses", value: fmt(summary.total_expenses), color: "#F87171", icon: TrendingDown },
        { label: "Net",            value: fmt(net), color: net >= 0 ? "#00E5CC" : "#F87171", icon: DollarSign },
      ].map(s => {
        const Icon = s.icon;
        return (
          <div key={s.label} style={card} className="rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} style={{ color: s.color }} />
              <p className="text-gray-400 text-xs">{s.label}</p>
            </div>
            <p style={{ color: s.color }} className="text-lg font-bold">{s.value}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Rates drawer ──────────────────────────────────────────────────────────────
function RatesDrawer({ onClose }) {
  const [rates, setRates]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState({});
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    getRates().then(r => {
      setRates(r.data);
      const init = {};
      r.data.forEach(x => { init[x.age_group] = x.rate_per_session; });
      setEditValues(init);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async (ag) => {
    setSaving(s => ({ ...s, [ag]: true }));
    try {
      await updateRate(ag, { rate_per_session: parseFloat(editValues[ag]) || 0 });
    } catch (e) {}
    setSaving(s => ({ ...s, [ag]: false }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.25)", maxWidth: 420, width: "100%" }}
        className="rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-white font-semibold">Rate per Session (by Age Group)</p>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={16} className="animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="space-y-3">
            {rates.map(r => (
              <div key={r.age_group} className="flex items-center gap-2">
                <span style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold w-32 text-center flex-shrink-0">
                  {AGE_GROUP_LABELS[r.age_group] || r.age_group}
                </span>
                <input style={input} type="number"
                  className="flex-1 rounded-lg p-2 text-sm focus:outline-none"
                  value={editValues[r.age_group] ?? ""}
                  onChange={e => setEditValues(v => ({ ...v, [r.age_group]: e.target.value }))} />
                <button onClick={() => save(r.age_group)} disabled={saving[r.age_group]}
                  style={btnPrimary} className="px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0">
                  {saving[r.age_group] ? "..." : "Save"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Income feed ───────────────────────────────────────────────────────────────
function IncomeFeed({ studentPayments, otherIncome }) {
  const [typeFilter, setTypeFilter] = useState("");

  const studentEntries = studentPayments
    .filter(k => k.payment?.status === "paid")
    .map(k => ({
      id:       `student-${k.id}`,
      type:     "student",
      title:    k.name,
      subtitle: AGE_GROUP_LABELS[k.age_group] || k.age_group,
      amount:   k.payment.display_amount ?? k.calculated_amount,
      date:     k.payment.updated_at || null,
    }));

  const otherEntries = otherIncome.map(o => ({
    id:       `other-${o.id}`,
    type:     "other",
    title:    o.title,
    subtitle: OTHER_INCOME_LABELS[o.category] || o.category,
    amount:   o.amount,
    date:     o.created_at || null,
  }));

  const combined = [...studentEntries, ...otherEntries]
    .filter(e => !typeFilter || e.type === typeFilter)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const total = combined.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div style={card} className="rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-white font-semibold text-sm">Income This Month</p>
          <p className="text-gray-500 text-xs mt-0.5">{combined.length} entries</p>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ color: "#00E5CC" }} className="text-sm font-bold">{fmt(total)}</span>
          <select style={{ ...input, backgroundImage: "none" }}
            className="rounded-lg px-3 py-1.5 text-xs focus:outline-none"
            value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value=""        style={{ backgroundColor: "#0D1F3C" }}>All</option>
            <option value="student" style={{ backgroundColor: "#0D1F3C" }}>Student Fees</option>
            <option value="other"   style={{ backgroundColor: "#0D1F3C" }}>Other Income</option>
          </select>
        </div>
      </div>

      {combined.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-6">No income recorded yet this month</p>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <div className="grid grid-cols-12 gap-2 pb-2 mb-1"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="col-span-1 text-gray-600 text-xs">Type</p>
            <p className="col-span-4 text-gray-600 text-xs">Name</p>
            <p className="col-span-3 text-gray-600 text-xs">Category</p>
            <p className="col-span-2 text-gray-600 text-xs">Date</p>
            <p className="col-span-2 text-gray-600 text-xs text-right">Amount</p>
          </div>
          {combined.map(e => (
            <div key={e.id} className="grid grid-cols-12 gap-2 py-2.5 items-center"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="col-span-1">
                <span style={e.type === "student"
                    ? { backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }
                    : { backgroundColor: "rgba(167,139,250,0.1)", color: "#A78BFA" }}
                  className="px-1.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                  {e.type === "student" ? "Fee" : "Other"}
                </span>
              </div>
              <p className="col-span-4 text-white text-sm truncate">{e.title}</p>
              <p className="col-span-3 text-gray-500 text-xs truncate">{e.subtitle}</p>
              <p className="col-span-2 text-gray-500 text-xs whitespace-nowrap">{formatDate(e.date)}</p>
              <p className="col-span-2 text-right text-sm font-semibold" style={{ color: "#00E5CC" }}>{fmt(e.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Income tab ────────────────────────────────────────────────────────────────
function IncomeTab({ month }) {
  const [locations, setLocations]       = useState([]);
  const [selectedLoc, setSelectedLoc]   = useState("");
  const [ageFilter, setAgeFilter]       = useState("");
  const [search, setSearch]             = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const [paidFilter, setPaidFilter]     = useState("");
  const [kids, setKids]                 = useState([]);
  const [paymentMap, setPaymentMap]     = useState({});
  const [saving, setSaving]             = useState({});
  const [editingKidId, setEditingKidId] = useState(null);
  const [editDraft, setEditDraft]       = useState("");
  const [otherIncome, setOtherIncome]   = useState([]);
  const [showOtherForm, setShowOther]   = useState(false);
  const [otherForm, setOtherForm]       = useState({ title: "", amount: "", category: "sponsors", notes: "" });
  const [loading, setLoading]           = useState(false);
  const [showRates, setShowRates]       = useState(false);

  useEffect(() => {
    getLocations().then(r => {
      setLocations(r.data.map(l => ({ id: l.id, name: l.name })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedLoc) params.location_id = selectedLoc;
      if (ageFilter)   params.age_group   = ageFilter;
      if (search)      params.search      = search;
      const [pRes, oRes] = await Promise.all([
        getPayments(month, params),
        getOtherIncome(month),
      ]);
      setKids(pRes.data.kids || []);
      setPaymentMap(pRes.data.payment_map || {});
      setOtherIncome(oRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [month, selectedLoc, ageFilter, search]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const toggleStatus = async (kid) => {
    const p      = paymentMap[kid.id] || {};
    const next   = (p.status || "unpaid") === "unpaid" ? "paid" : "unpaid";
    const amount = p.is_manual_amount ? (p.amount ?? kid.calculated_amount) : kid.calculated_amount;
    setSaving(s => ({ ...s, [kid.id]: true }));
    try {
      const res = await upsertPayment({
        kid_id: kid.id, month, status: next,
        amount, note: p.note || null,
        is_manual_amount: p.is_manual_amount || false,
      });
      setPaymentMap(m => ({
        ...m,
        [kid.id]: { ...res.data, display_amount: res.data.amount ?? kid.calculated_amount },
      }));
    } catch (e) {}
    setSaving(s => ({ ...s, [kid.id]: false }));
  };

  const saveOverride = async (kid) => {
    const p = paymentMap[kid.id] || {};
    setSaving(s => ({ ...s, [kid.id]: true }));
    try {
      const res = await upsertPayment({
        kid_id: kid.id, month,
        status: p.status || "unpaid",
        amount: parseFloat(editDraft) || 0,
        note:   p.note || null,
        is_manual_amount: true,
      });
      setPaymentMap(m => ({
        ...m,
        [kid.id]: { ...res.data, display_amount: res.data.amount },
      }));
    } catch (e) {}
    setSaving(s => ({ ...s, [kid.id]: false }));
    setEditingKidId(null);
    setEditDraft("");
  };

  const resetOverride = async (kid) => {
    const p = paymentMap[kid.id] || {};
    setSaving(s => ({ ...s, [kid.id]: true }));
    try {
      const res = await upsertPayment({
        kid_id: kid.id, month,
        status: p.status || "unpaid",
        amount: kid.calculated_amount,
        note:   p.note || null,
        is_manual_amount: false,
      });
      setPaymentMap(m => ({
        ...m,
        [kid.id]: { ...res.data, display_amount: kid.calculated_amount },
      }));
    } catch (e) {}
    setSaving(s => ({ ...s, [kid.id]: false }));
  };

  const handleAddOther = async () => {
    if (!otherForm.title || !otherForm.amount) return;
    try {
      await createOtherIncome({ ...otherForm, amount: parseFloat(otherForm.amount), month });
      setOtherForm({ title: "", amount: "", category: "sponsors", notes: "" });
      setShowOther(false);
      getOtherIncome(month).then(r => setOtherIncome(r.data));
    } catch (e) {}
  };

  const handleDeleteOther = async (id) => {
    await deleteOtherIncome(id);
    setOtherIncome(o => o.filter(x => x.id !== id));
  };

  // All kids with payment info attached
  const allKidsWithPayment = kids.map(k => ({
    ...k,
    payment: paymentMap[k.id]
      ? { ...paymentMap[k.id], display_amount: paymentMap[k.id].display_amount ?? k.calculated_amount }
      : { display_amount: k.calculated_amount, status: "unpaid", is_manual_amount: false },
  }));

  // Further filtered by paid/unpaid pill
  const kidsWithPayment = allKidsWithPayment
    .filter(k => !paidFilter || (k.payment.status || "unpaid") === paidFilter);

  return (
    <div className="space-y-5">

      {/* Student fees card */}
      <div style={card} className="rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold text-sm">Student Fees</p>
          <button onClick={() => setShowRates(true)} style={btnOutline}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
            Edit Rates
          </button>
        </div>

        {/* Name / age / location filters */}
        <StudentFilter
          search={searchInput} onSearch={setSearchInput}
          ageFilter={ageFilter} onAge={v => { setAgeFilter(v); setPaidFilter(""); }}
          locationFilter={selectedLoc} onLocation={v => { setSelectedLoc(v); setPaidFilter(""); }}
          locations={locations}
          resultCount={kidsWithPayment.length}
        />

        {/* Paid / Unpaid filter pills */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-gray-500 text-xs">Status:</span>
          {[
            { value: "",       label: "All",    color: "#9CA3AF", activeBg: "rgba(255,255,255,0.08)" },
            { value: "paid",   label: "Paid",   color: "#00E5CC", activeBg: "rgba(0,229,204,0.12)"  },
            { value: "unpaid", label: "Unpaid", color: "#F87171", activeBg: "rgba(239,68,68,0.12)"  },
          ].map(opt => {
            const count = opt.value === ""
              ? allKidsWithPayment.length
              : allKidsWithPayment.filter(k => (k.payment.status || "unpaid") === opt.value).length;
            const active = paidFilter === opt.value;
            return (
              <button key={opt.value} onClick={() => setPaidFilter(opt.value)}
                style={active
                  ? { backgroundColor: opt.activeBg, color: opt.color, border: `1px solid ${opt.color}50` }
                  : { backgroundColor: "transparent", color: "#6B7280", border: "1px solid rgba(255,255,255,0.08)" }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all">
                {opt.label}
                <span style={active
                    ? { backgroundColor: opt.color, color: "#0A1628" }
                    : { backgroundColor: "rgba(255,255,255,0.08)", color: "#6B7280" }}
                  className="px-1.5 py-0.5 rounded-full text-xs font-bold">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-8">
            <Loader2 size={14} className="animate-spin" style={{ color: "#00E5CC" }} /> Loading...
          </div>
        ) : (
          <>
            {/* Column header */}
            <div className="grid grid-cols-12 gap-2 mt-4 pb-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="col-span-4 text-gray-600 text-xs">Student</p>
              <p className="col-span-2 text-gray-600 text-xs text-center">Sessions</p>
              <p className="col-span-3 text-gray-600 text-xs text-right">Amount</p>
              <p className="col-span-3 text-gray-600 text-xs text-right">Status</p>
            </div>

            {/* Scrollable rows */}
            <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
              {kidsWithPayment.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-6">No students found</p>
              )}
              {kidsWithPayment.map(k => {
                const status     = k.payment.status || "unpaid";
                const isManual   = k.payment.is_manual_amount;
                const displayAmt = k.payment.display_amount ?? k.calculated_amount;
                const isEditing  = editingKidId === k.id;

                return (
                  <div key={k.id} className="grid grid-cols-12 gap-2 py-2.5 items-center"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

                    {/* Avatar + Name */}
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <div style={{ backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {k.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{k.name}</p>
                        <p className="text-gray-500 text-xs truncate">
                          {AGE_GROUP_LABELS[k.age_group] || k.age_group}
                          {k.locations?.name ? ` · ${k.locations.name}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Sessions */}
                    <div className="col-span-2 text-center">
                      <p style={{ color: "#4DFFD2" }} className="text-sm font-bold">{k.sessions_attended}</p>
                      <p className="text-gray-600 text-xs">sessions</p>
                    </div>

                    {/* Amount */}
                    <div className="col-span-3 flex items-center justify-end gap-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 text-xs">LKR</span>
                          <input style={input} type="number" autoFocus
                            className="w-16 rounded-lg p-1 text-xs focus:outline-none"
                            value={editDraft}
                            onChange={e => setEditDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") saveOverride(k);
                              if (e.key === "Escape") { setEditingKidId(null); setEditDraft(""); }
                            }}
                          />
                          <button onClick={() => saveOverride(k)} disabled={saving[k.id]}
                            style={btnPrimary} className="px-2 py-1 rounded-lg text-xs font-semibold">
                            {saving[k.id] ? "..." : "✓"}
                          </button>
                          <button onClick={() => { setEditingKidId(null); setEditDraft(""); }}
                            style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}
                            className="px-2 py-1 rounded-lg text-xs">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <div className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-white text-xs font-semibold">
                                LKR {(displayAmt || 0).toLocaleString()}
                              </span>
                              {isManual && (
                                <span style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "#FCD34D", border: "1px solid rgba(251,191,36,0.3)" }}
                                  className="text-xs px-1 py-0.5 rounded-full font-semibold">
                                  custom
                                </span>
                              )}
                            </div>
                            {isManual && (
                              <p className="text-gray-600 text-xs text-right">
                                calc: {(k.calculated_amount || 0).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <button onClick={() => { setEditingKidId(k.id); setEditDraft(String(displayAmt || "")); }}
                            style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}
                            className="p-1 rounded-lg hover:text-white transition-all flex-shrink-0"
                            title="Override amount">
                            <Pencil size={11} />
                          </button>
                          {isManual && (
                            <button onClick={() => resetOverride(k)} disabled={saving[k.id]}
                              style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}
                              className="p-1 rounded-lg hover:text-cyan-400 transition-all flex-shrink-0"
                              title="Reset to calculated rate">
                              <RefreshCw size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status pill */}
                    <div className="col-span-3 flex justify-end">
                      <StatusPill
                        status={status}
                        saving={saving[k.id]}
                        disabled={isEditing}
                        onClick={() => toggleStatus(k)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Other income card */}
      <div style={card} className="rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-semibold text-sm">Other Income</p>
            <p className="text-gray-500 text-xs mt-0.5">Events, payments, and other sources</p>
          </div>
          <button onClick={() => setShowOther(f => !f)}
            style={showOtherForm ? btnOutline : btnPrimary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
            {showOtherForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add</>}
          </button>
        </div>

        {showOtherForm && (
          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(0,229,204,0.15)" }}
            className="rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title</label>
                <input style={input} className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  placeholder="e.g. July tournament entry" value={otherForm.title}
                  onChange={e => setOtherForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Amount (LKR)</label>
                <input style={input} type="number" className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  placeholder="0.00" value={otherForm.amount}
                  onChange={e => setOtherForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Category</label>
              <select style={{ ...input, backgroundImage: "none" }}
                className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                value={otherForm.category}
                onChange={e => setOtherForm(f => ({ ...f, category: e.target.value }))}>
                {OTHER_INCOME_OPTIONS.map(c => (
                  <option key={c.value} value={c.value} style={{ backgroundColor: "#0D1F3C" }}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
              <input style={input} className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                placeholder="Any additional info..." value={otherForm.notes}
                onChange={e => setOtherForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button onClick={handleAddOther} style={btnPrimary}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-all">
              <Check size={13} /> Add Income
            </button>
          </div>
        )}

        <div className="space-y-2">
          {otherIncome.length === 0 && !showOtherForm && (
            <p className="text-gray-600 text-sm text-center py-4">No other income recorded this month</p>
          )}
          {otherIncome.map(o => (
            <div key={o.id} className="flex items-center gap-3 py-2 group"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ backgroundColor: "rgba(167,139,250,0.1)", color: "#A78BFA" }}
                className="px-2 py-0.5 rounded-full text-xs flex-shrink-0 whitespace-nowrap">
                {OTHER_INCOME_LABELS[o.category] || o.category}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{o.title}</p>
                {o.notes && <p className="text-gray-500 text-xs">{o.notes}</p>}
              </div>
              <p className="text-gray-500 text-xs flex-shrink-0">{formatDate(o.created_at)}</p>
              <p style={{ color: "#00E5CC" }} className="text-sm font-semibold flex-shrink-0">{fmt(o.amount)}</p>
              <button onClick={() => handleDeleteOther(o.id)}
                className="opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:text-red-300 flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Income feed — always uses allKidsWithPayment so paid list is unaffected by pills */}
      <IncomeFeed studentPayments={allKidsWithPayment} otherIncome={otherIncome} />

      {showRates && <RatesDrawer onClose={() => setShowRates(false)} />}
    </div>
  );
}

// ── Expense feed ──────────────────────────────────────────────────────────────
function ExpenseFeed({ expenses, salaries }) {
  const [typeFilter, setTypeFilter] = useState("");

  const expenseEntries = expenses.map(x => ({
    id: `expense-${x.id}`, type: "expense",
    title: x.title, subtitle: x.notes || "—",
    amount: x.amount, date: x.created_at || null,
  }));
  const salaryEntries = salaries.map(x => ({
    id: `salary-${x.id}`, type: "salary",
    title: x.coaches?.name || "Unknown Coach", subtitle: x.notes || "—",
    amount: x.amount, date: x.created_at || null,
  }));

  const combined = [...expenseEntries, ...salaryEntries]
    .filter(e => !typeFilter || e.type === typeFilter)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const total = combined.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div style={card} className="rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-white font-semibold text-sm">Expenses This Month</p>
          <p className="text-gray-500 text-xs mt-0.5">{combined.length} entries</p>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ color: "#F87171" }} className="text-sm font-bold">{fmt(total)}</span>
          <select style={{ ...input, backgroundImage: "none" }}
            className="rounded-lg px-3 py-1.5 text-xs focus:outline-none"
            value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value=""         style={{ backgroundColor: "#0D1F3C" }}>All</option>
            <option value="expense"  style={{ backgroundColor: "#0D1F3C" }}>Expenses</option>
            <option value="salary"   style={{ backgroundColor: "#0D1F3C" }}>Salaries</option>
          </select>
        </div>
      </div>

      {combined.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-6">No expenses recorded yet this month</p>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <div className="grid grid-cols-12 gap-2 pb-2 mb-1"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="col-span-1 text-gray-600 text-xs">Type</p>
            <p className="col-span-4 text-gray-600 text-xs">Name</p>
            <p className="col-span-3 text-gray-600 text-xs">Notes</p>
            <p className="col-span-2 text-gray-600 text-xs">Date</p>
            <p className="col-span-2 text-gray-600 text-xs text-right">Amount</p>
          </div>
          {combined.map(e => (
            <div key={e.id} className="grid grid-cols-12 gap-2 py-2.5 items-center"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="col-span-1">
                <span style={e.type === "expense"
                    ? { backgroundColor: "rgba(251,191,36,0.1)", color: "#FCD34D" }
                    : { backgroundColor: "rgba(167,139,250,0.1)", color: "#A78BFA" }}
                  className="px-1.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                  {e.type === "expense" ? "Exp" : "Sal"}
                </span>
              </div>
              <p className="col-span-4 text-white text-sm truncate">{e.title}</p>
              <p className="col-span-3 text-gray-500 text-xs truncate">{e.subtitle}</p>
              <p className="col-span-2 text-gray-500 text-xs whitespace-nowrap">{formatDate(e.date)}</p>
              <p className="col-span-2 text-right text-sm font-semibold" style={{ color: "#F87171" }}>{fmt(e.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Expenses tab ──────────────────────────────────────────────────────────────
function ExpensesTab({ month }) {
  const [coaches, setCoaches]         = useState([]);
  const [expenses, setExpenses]       = useState([]);
  const [salaries, setSalaries]       = useState([]);
  const [showExpense, setShowExpense] = useState(false);
  const [showSalary, setShowSalary]   = useState(false);
  const [expForm, setExpForm]         = useState({ title: "", amount: "", notes: "" });
  const [salForm, setSalForm]         = useState({ coach_id: "", amount: "", notes: "" });
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    getCoaches().then(r => setCoaches(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, sRes] = await Promise.all([getExpenses(month), getSalaries(month)]);
      setExpenses(eRes.data);
      setSalaries(sRes.data);
    } catch (e) {}
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const addExpense = async () => {
    if (!expForm.title || !expForm.amount) return;
    await createExpense({ ...expForm, amount: parseFloat(expForm.amount), month });
    setExpForm({ title: "", amount: "", notes: "" });
    setShowExpense(false);
    getExpenses(month).then(r => setExpenses(r.data));
  };

  const addSalary = async () => {
    if (!salForm.coach_id || !salForm.amount) return;
    await createSalary({ ...salForm, amount: parseFloat(salForm.amount), month });
    setSalForm({ coach_id: "", amount: "", notes: "" });
    setShowSalary(false);
    getSalaries(month).then(r => setSalaries(r.data));
  };

  const expenseTotal = expenses.reduce((s, x) => s + (x.amount || 0), 0);
  const salaryTotal  = salaries.reduce((s, x) => s + (x.amount || 0), 0);

  const ExpenseRow = ({ item, onDelete, amountColor = "#F87171" }) => (
    <div className="flex items-center gap-3 py-2.5 group"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm">{item.title || item.coaches?.name}</p>
        {item.notes && <p className="text-gray-500 text-xs">{item.notes}</p>}
      </div>
      <p className="text-gray-500 text-xs flex-shrink-0">{formatDate(item.created_at)}</p>
      <p style={{ color: amountColor }} className="text-sm font-semibold flex-shrink-0">{fmt(item.amount)}</p>
      <button onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:text-red-300 flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Expenses", value: expenseTotal, color: "#FCD34D" },
          { label: "Salaries", value: salaryTotal,  color: "#A78BFA" },
        ].map(s => (
          <div key={s.label} style={card} className="rounded-xl p-3 text-center">
            <p style={{ color: s.color }} className="text-lg font-bold">{fmt(s.value)}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Expenses section */}
      <div style={card} className="rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-semibold text-sm">Expenses</p>
            <p className="text-gray-500 text-xs mt-0.5">All costs for this month</p>
          </div>
          <div className="flex items-center gap-3">
            {expenseTotal > 0 && (
              <span style={{ color: "#FCD34D" }} className="text-sm font-bold">{fmt(expenseTotal)}</span>
            )}
            <button onClick={() => setShowExpense(f => !f)}
              style={showExpense ? btnOutline : btnPrimary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
              {showExpense ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add</>}
            </button>
          </div>
        </div>

        {showExpense && (
          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(251,191,36,0.15)" }}
            className="rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title</label>
                <input style={input} className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  placeholder="e.g. Ground rent, equipment..." value={expForm.title}
                  onChange={e => setExpForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Amount (LKR)</label>
                <input style={input} type="number" className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  placeholder="0.00" value={expForm.amount}
                  onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
              <input style={input} className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                placeholder="Any details..." value={expForm.notes}
                onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button onClick={addExpense} style={btnPrimary}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-all">
              <Check size={13} /> Add Expense
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={14} className="animate-spin text-gray-500" />
          </div>
        ) : expenses.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">No expenses added this month</p>
        ) : (
          <div>
            {expenses.map(x => (
              <ExpenseRow key={x.id} item={x}
                onDelete={async (id) => { await deleteExpense(id); setExpenses(e => e.filter(i => i.id !== id)); }} />
            ))}
          </div>
        )}
      </div>

      {/* Salaries section */}
      <div style={card} className="rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-semibold text-sm">Salaries</p>
            <p className="text-gray-500 text-xs mt-0.5">Coach payments for this month</p>
          </div>
          <div className="flex items-center gap-3">
            {salaryTotal > 0 && (
              <span style={{ color: "#A78BFA" }} className="text-sm font-bold">{fmt(salaryTotal)}</span>
            )}
            <button onClick={() => setShowSalary(f => !f)}
              style={showSalary ? btnOutline : btnPrimary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
              {showSalary ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add</>}
            </button>
          </div>
        </div>

        {showSalary && (
          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(167,139,250,0.15)" }}
            className="rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Coach</label>
                <select style={{ ...input, backgroundImage: "none" }}
                  className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  value={salForm.coach_id}
                  onChange={e => setSalForm(f => ({ ...f, coach_id: e.target.value }))}>
                  <option value="" style={{ backgroundColor: "#0D1F3C" }}>Select coach...</option>
                  {coaches.map(c => (
                    <option key={c.id} value={c.id} style={{ backgroundColor: "#0D1F3C" }}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Amount (LKR)</label>
                <input style={input} type="number" className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  placeholder="0.00" value={salForm.amount}
                  onChange={e => setSalForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
              <input style={input} className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                placeholder="e.g. Includes bonus" value={salForm.notes}
                onChange={e => setSalForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button onClick={addSalary} style={btnPrimary}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-all">
              <Check size={13} /> Add Salary
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={14} className="animate-spin text-gray-500" />
          </div>
        ) : salaries.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">No salaries recorded this month</p>
        ) : (
          <div>
            {salaries.map(x => (
              <ExpenseRow key={x.id}
                item={{ ...x, title: x.coaches?.name || "Unknown Coach" }}
                amountColor="#A78BFA"
                onDelete={async (id) => { await deleteSalary(id); setSalaries(s => s.filter(i => i.id !== id)); }} />
            ))}
          </div>
        )}
      </div>

      {/* Expense feed */}
      <ExpenseFeed expenses={expenses} salaries={salaries} />
    </div>
  );
}

// ── Main Finance page ─────────────────────────────────────────────────────────
export default function Finance() {
  const today = new Date();
  const [month, setMonth]     = useState(toMonthStr(today));
  const [tab, setTab]         = useState("income");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    getSummary(month).then(r => setSummary(r.data)).catch(() => {});
  }, [month]);

  return (
    <div style={pageWrapper} className="p-5 sm:p-7 lg:p-9">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Finance</h1>
          <p className="text-gray-500 mt-1 text-sm">Track income and expenses for your academy</p>
        </div>
        <MonthNav month={month} onChange={setMonth} />
      </div>

      {/* Summary cards */}
      <SummaryCards summary={summary} />

      {/* Net bar */}
      {summary && (
        <div style={card} className="rounded-xl p-4 mb-6">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-400">Income vs Expenses</span>
            <span style={{ color: summary.net >= 0 ? "#00E5CC" : "#F87171" }} className="font-semibold">
              {summary.net >= 0 ? "+" : ""}{fmt(summary.net)} net
            </span>
          </div>
          <div style={{ backgroundColor: "rgba(255,255,255,0.06)" }} className="rounded-full h-2 overflow-hidden">
            <div style={{
              width: summary.total_income > 0
                ? `${Math.min((summary.total_income / (summary.total_income + summary.total_expenses)) * 100, 100)}%`
                : "0%",
              backgroundColor: "#00E5CC",
              transition: "width 0.6s ease",
            }} className="h-2 rounded-full" />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-600">Income: {fmt(summary.total_income)}</span>
            <span className="text-gray-600">Expenses: {fmt(summary.total_expenses)}</span>
          </div>
        </div>
      )}

      {/* Tab toggle */}
      <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }}
        className="flex rounded-xl p-1 mb-6 w-fit gap-1">
        {[
          { id: "income",   label: "Income",   icon: TrendingUp   },
          { id: "expenses", label: "Expenses", icon: TrendingDown },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={tab === id
              ? { backgroundColor: "#00E5CC", color: "#0A1628" }
              : { color: "#9CA3AF" }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all">
            <Icon size={14} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      {tab === "income"   && <IncomeTab   month={month} />}
      {tab === "expenses" && <ExpensesTab month={month} />}
    </div>
  );
}