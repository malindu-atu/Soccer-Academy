import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, X,
  TrendingUp, TrendingDown, DollarSign, MapPin,
  Users, Loader2, Check, AlertCircle
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

const getLocations       = ()      => api.get("/locations/");
const getCoaches         = ()      => api.get("/coaches/");
const getSummary         = (m)     => api.get(`/finance/summary/${m}`);
const getRates           = ()      => api.get("/finance/rates");
const updateRate         = (ag, d) => api.put(`/finance/rates/${ag}`, d);
const getPayments        = (m, params = {}) => api.get(`/finance/payments?month=${m}`, { params });
const getPaymentSummary  = (m, l)  => api.get(`/finance/payments/summary/${m}${l ? `?location_id=${l}` : ""}`);
const upsertPayment      = (d)     => api.post("/finance/payments", d);
const getOtherIncome     = (m)     => api.get(`/finance/other-income?month=${m}`);
const createOtherIncome  = (d)     => api.post("/finance/other-income", d);
const deleteOtherIncome  = (id)    => api.delete(`/finance/other-income/${id}`);
const getExpenses        = (m)     => api.get(`/finance/expenses?month=${m}`);
const createExpense      = (d)     => api.post("/finance/expenses", d);
const deleteExpense      = (id)    => api.delete(`/finance/expenses/${id}`);
const getSalaries        = (m)     => api.get(`/finance/salaries?month=${m}`);
const createSalary       = (d)     => api.post("/finance/salaries", d);
const deleteSalary       = (id)    => api.delete(`/finance/salaries/${id}`);
// ── Helpers ───────────────────────────────────────────────────────────────────
function toMonthStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function formatMonth(m) {
  const [y, mo] = m.split("-");
  return new Date(y, mo-1).toLocaleString("default", { month: "long", year: "numeric" });
}
function fmt(n) {
  return `LKR ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_CFG = {
  paid:   { color: "#00E5CC", bg: "rgba(0,229,204,0.12)",  label: "Paid",   icon: "✓" },
  unpaid: { color: "#F87171", bg: "rgba(239,68,68,0.12)",  label: "Unpaid", icon: "✕" },
  waived: { color: "#FCD34D", bg: "rgba(251,191,36,0.12)", label: "Waived", icon: "~" },
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
function StatusPill({ status, onClick, saving }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.unpaid;
  return (
    <button onClick={onClick} disabled={saving}
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, minWidth: 80 }}
      className="px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80 flex items-center gap-1.5 justify-center">
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
        { label: "Net",            value: fmt(net),                    color: net >= 0 ? "#00E5CC" : "#F87171", icon: DollarSign },
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

// ── Income tab ────────────────────────────────────────────────────────────────
function IncomeTab({ month }) {
  const [locations, setLocations]     = useState([]);
  const [selectedLoc, setSelectedLoc] = useState("");
  const [kids, setKids]               = useState([]);
  const [paymentMap, setPaymentMap]   = useState({});
  const [paymentSummary, setPS]       = useState(null);
  const [saving, setSaving]           = useState({});
  const [search, setSearch]           = useState("");
  const [otherIncome, setOtherIncome] = useState([]);
  const [showOtherForm, setShowOther] = useState(false);
  const [otherForm, setOtherForm]     = useState({ title: "", amount: "", category: "sponsor", notes: "" });
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    getLocations().then(r => setLocations(r.data)).catch(() => {});
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, psRes, oRes] = await Promise.all([
        getPayments(month, selectedLoc),
        getPaymentSummary(month, selectedLoc),
        getOtherIncome(month),
      ]);
      setKids(pRes.data.kids || []);
      setPaymentMap(pRes.data.payment_map || {});
      setPS(psRes.data);
      setOtherIncome(oRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [month, selectedLoc]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const cycleStatus = async (kid) => {
    const current = paymentMap[kid.id]?.status || "unpaid";
    const next    = current === "unpaid" ? "paid" : current === "paid" ? "waived" : "unpaid";
    setSaving(s => ({ ...s, [kid.id]: true }));
    try {
      const res = await upsertPayment({
        kid_id: kid.id, month, status: next,
        amount: paymentMap[kid.id]?.amount || null,
        note:   paymentMap[kid.id]?.note   || null,
      });
      setPaymentMap(m => ({ ...m, [kid.id]: res.data }));
      getPaymentSummary(month, selectedLoc).then(r => setPS(r.data));
    } catch (e) {}
    setSaving(s => ({ ...s, [kid.id]: false }));
  };

  const handleAddOther = async () => {
    if (!otherForm.title || !otherForm.amount) return;
    try {
      await createOtherIncome({ ...otherForm, amount: parseFloat(otherForm.amount), month });
      setOtherForm({ title: "", amount: "", category: "sponsor", notes: "" });
      setShowOther(false);
      getOtherIncome(month).then(r => setOtherIncome(r.data));
    } catch (e) {}
  };

  const handleDeleteOther = async (id) => {
    await deleteOtherIncome(id);
    setOtherIncome(o => o.filter(x => x.id !== id));
  };

  const filteredKids = kids.filter(k =>
    !search || k.name.toLowerCase().includes(search.toLowerCase())
  );

  const collectionRate = paymentSummary?.collection_rate ?? 0;
  const rateColor      = collectionRate >= 80 ? "#00E5CC" : collectionRate >= 50 ? "#FCD34D" : "#F87171";
  const otherTotal     = otherIncome.reduce((s, o) => s + (o.amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Location selector */}
      <div style={card} className="rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={14} style={{ color: "#00E5CC" }} />
          <p className="text-white font-semibold text-sm">Student Fees by Location</p>
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          <button onClick={() => setSelectedLoc("")}
            style={!selectedLoc
              ? { backgroundColor: "#00E5CC", color: "#0A1628" }
              : { backgroundColor: "rgba(0,229,204,0.08)", color: "#00E5CC", border: "1px solid rgba(0,229,204,0.3)" }}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all">
            All Locations
          </button>
          {locations.map(l => (
            <button key={l.id} onClick={() => setSelectedLoc(l.id)}
              style={selectedLoc === l.id
                ? { backgroundColor: "#00E5CC", color: "#0A1628" }
                : { backgroundColor: "rgba(0,229,204,0.08)", color: "#00E5CC", border: "1px solid rgba(0,229,204,0.3)" }}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all">
              {l.name}
            </button>
          ))}
        </div>

        {/* Payment summary */}
        {paymentSummary && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: "Total",   value: paymentSummary.total,  color: "#9CA3AF" },
              { label: "Paid",    value: paymentSummary.paid,   color: "#00E5CC" },
              { label: "Unpaid",  value: paymentSummary.unpaid, color: "#F87171" },
              { label: "Rate",    value: `${collectionRate}%`,  color: rateColor  },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }}
                className="rounded-xl p-3 text-center">
                <p style={{ color: s.color }} className="text-xl font-bold">{s.value}</p>
                <p className="text-gray-500 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ backgroundColor: "rgba(255,255,255,0.06)" }} className="rounded-full h-1.5 mb-4">
          <div style={{ width: `${collectionRate}%`, backgroundColor: rateColor, transition: "width 0.6s ease" }}
            className="h-1.5 rounded-full" />
        </div>

        {/* Search */}
        <div className="mb-3">
          <input style={input}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            placeholder="Search student..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Student list */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-8">
            <Loader2 size={14} className="animate-spin" style={{ color: "#00E5CC" }} /> Loading...
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredKids.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-6">No students found</p>
            )}
            {filteredKids.map(k => {
              const p      = paymentMap[k.id];
              const status = p?.status || "unpaid";
              return (
                <div key={k.id} className="flex items-center gap-3 py-3">
                  <div style={{ backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {k.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{k.name}</p>
                    <p className="text-gray-500 text-xs">
                      {k.age_group}
                      {k.locations?.name ? ` · ${k.locations.name}` : ""}
                      {p?.amount ? ` · LKR ${p.amount.toLocaleString()}` : ""}
                    </p>
                  </div>
                  <StatusPill status={status} saving={saving[k.id]} onClick={() => cycleStatus(k)} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Other income */}
      <div style={card} className="rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-semibold text-sm">Other Income</p>
            <p className="text-gray-500 text-xs mt-0.5">Sponsors, donations, and other sources</p>
          </div>
          <div className="flex items-center gap-3">
            {otherTotal > 0 && (
              <span style={{ color: "#00E5CC" }} className="text-sm font-bold">{fmt(otherTotal)}</span>
            )}
            <button onClick={() => setShowOther(f => !f)}
              style={showOtherForm ? btnOutline : btnPrimary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
              {showOtherForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add</>}
            </button>
          </div>
        </div>

        {showOtherForm && (
          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(0,229,204,0.15)" }}
            className="rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title</label>
                <input style={input} className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  placeholder="e.g. Sponsor payment" value={otherForm.title}
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
                value={otherForm.category} onChange={e => setOtherForm(f => ({ ...f, category: e.target.value }))}>
                {["sponsor","donation","grant","other"].map(c => (
                  <option key={c} value={c} style={{ backgroundColor: "#0D1F3C" }} className="capitalize">{c}</option>
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
            <div key={o.id} className="flex items-center gap-3 group">
              <div style={{ backgroundColor: "rgba(0,229,204,0.08)", color: "#00E5CC" }}
                className="px-2 py-0.5 rounded-full text-xs capitalize flex-shrink-0">{o.category}</div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{o.title}</p>
                {o.notes && <p className="text-gray-500 text-xs">{o.notes}</p>}
              </div>
              <p style={{ color: "#00E5CC" }} className="text-sm font-semibold flex-shrink-0">{fmt(o.amount)}</p>
              <button onClick={() => handleDeleteOther(o.id)}
                className="opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:text-red-300">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Expenses tab ──────────────────────────────────────────────────────────────
function ExpensesTab({ month }) {
  const [coaches, setCoaches]           = useState([]);
  const [fixed, setFixed]               = useState([]);
  const [variable, setVariable]         = useState([]);
  const [salaries, setSalaries]         = useState([]);
  const [showFixed, setShowFixed]       = useState(false);
  const [showVariable, setShowVariable] = useState(false);
  const [showSalary, setShowSalary]     = useState(false);
  const [fixedForm, setFixedForm]       = useState({ title: "", amount: "" });
  const [varForm, setVarForm]           = useState({ title: "", amount: "", notes: "" });
  const [salForm, setSalForm]           = useState({ coach_id: "", amount: "", notes: "" });
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    getCoaches().then(r => setCoaches(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, vRes, sRes] = await Promise.all([
        getFixedExpenses(),
        getVariableExpenses(month),
        getSalaries(month),
      ]);
      setFixed(fRes.data);
      setVariable(vRes.data);
      setSalaries(sRes.data);
    } catch (e) {}
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const addFixed = async () => {
    if (!fixedForm.title || !fixedForm.amount) return;
    await createFixedExpense({ title: fixedForm.title, amount: parseFloat(fixedForm.amount) });
    setFixedForm({ title: "", amount: "" });
    setShowFixed(false);
    getFixedExpenses().then(r => setFixed(r.data));
  };

  const addVariable = async () => {
    if (!varForm.title || !varForm.amount) return;
    await createVariableExp({ ...varForm, amount: parseFloat(varForm.amount), month });
    setVarForm({ title: "", amount: "", notes: "" });
    setShowVariable(false);
    getVariableExpenses(month).then(r => setVariable(r.data));
  };

  const addSalary = async () => {
    if (!salForm.coach_id || !salForm.amount) return;
    await createSalary({ ...salForm, amount: parseFloat(salForm.amount), month });
    setSalForm({ coach_id: "", amount: "", notes: "" });
    setShowSalary(false);
    getSalaries(month).then(r => setSalaries(r.data));
  };

  const fixedTotal    = fixed.reduce((s, x) => s + (x.amount || 0), 0);
  const variableTotal = variable.reduce((s, x) => s + (x.amount || 0), 0);
  const salaryTotal   = salaries.reduce((s, x) => s + (x.amount || 0), 0);
  const totalExpenses = fixedTotal + variableTotal + salaryTotal;

  const ExpenseRow = ({ item, onDelete, amountColor = "#F87171" }) => (
    <div className="flex items-center gap-3 py-2.5 group"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm">{item.title || item.coaches?.name}</p>
        {item.notes && <p className="text-gray-500 text-xs">{item.notes}</p>}
      </div>
      <p style={{ color: amountColor }} className="text-sm font-semibold flex-shrink-0">{fmt(item.amount)}</p>
      <button onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:text-red-300 flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );

  const SectionCard = ({ title, subtitle, total, color, showForm, onToggle, form, children }) => (
    <div style={card} className="rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-semibold text-sm">{title}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && <span style={{ color }} className="text-sm font-bold">{fmt(total)}</span>}
          <button onClick={onToggle}
            style={showForm ? btnOutline : { ...btnPrimary, fontSize: 11 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
            {showForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add</>}
          </button>
        </div>
      </div>
      {form}
      {children}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Total expenses summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Fixed",    value: fixedTotal,    color: "#F87171" },
          { label: "Salaries", value: salaryTotal,   color: "#A78BFA" },
          { label: "Variable", value: variableTotal, color: "#FCD34D" },
        ].map(s => (
          <div key={s.label} style={card} className="rounded-xl p-3 text-center">
            <p style={{ color: s.color }} className="text-lg font-bold">{fmt(s.value)}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Fixed expenses */}
      <SectionCard
        title="Fixed Expenses"
        subtitle="Recurring monthly costs (rent, utilities, etc)"
        total={fixedTotal}
        color="#F87171"
        showForm={showFixed}
        onToggle={() => setShowFixed(f => !f)}
        form={showFixed && (
          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(248,113,113,0.15)" }}
            className="rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title</label>
                <input style={input} className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  placeholder="e.g. Ground rent" value={fixedForm.title}
                  onChange={e => setFixedForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Monthly Amount (LKR)</label>
                <input style={input} type="number" className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  placeholder="0.00" value={fixedForm.amount}
                  onChange={e => setFixedForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <button onClick={addFixed} style={btnPrimary}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-all">
              <Check size={13} /> Add Fixed Expense
            </button>
          </div>
        )}
      >
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-gray-500" /></div>
        ) : fixed.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">No fixed expenses added</p>
        ) : (
          <div>
            {fixed.map(x => (
              <ExpenseRow key={x.id} item={x}
                onDelete={async (id) => { await deleteFixedExpense(id); setFixed(f => f.filter(i => i.id !== id)); }} />
            ))}
            <div style={{ backgroundColor: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}
              className="rounded-lg px-3 py-2 mt-3 flex justify-between">
              <span className="text-gray-400 text-xs">Monthly fixed total</span>
              <span style={{ color: "#F87171" }} className="text-xs font-bold">{fmt(fixedTotal)}</span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Salaries */}
      <SectionCard
        title="Salaries"
        subtitle="Coach payments for this month"
        total={salaryTotal}
        color="#A78BFA"
        showForm={showSalary}
        onToggle={() => setShowSalary(f => !f)}
        form={showSalary && (
          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(167,139,250,0.15)" }}
            className="rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Coach</label>
                <select style={{ ...input, backgroundImage: "none" }}
                  className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  value={salForm.coach_id} onChange={e => setSalForm(f => ({ ...f, coach_id: e.target.value }))}>
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
      >
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-gray-500" /></div>
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
      </SectionCard>

      {/* Variable expenses */}
      <SectionCard
        title="Variable Expenses"
        subtitle="One-off costs this month (equipment, travel, etc)"
        total={variableTotal}
        color="#FCD34D"
        showForm={showVariable}
        onToggle={() => setShowVariable(f => !f)}
        form={showVariable && (
          <div style={{ backgroundColor: "#0A1628", border: "1px solid rgba(251,191,36,0.15)" }}
            className="rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title</label>
                <input style={input} className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  placeholder="e.g. Equipment purchase" value={varForm.title}
                  onChange={e => setVarForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Amount (LKR)</label>
                <input style={input} type="number" className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  placeholder="0.00" value={varForm.amount}
                  onChange={e => setVarForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
              <input style={input} className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                placeholder="Any details..." value={varForm.notes}
                onChange={e => setVarForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button onClick={addVariable} style={btnPrimary}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-all">
              <Check size={13} /> Add Expense
            </button>
          </div>
        )}
      >
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-gray-500" /></div>
        ) : variable.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">No variable expenses this month</p>
        ) : (
          <div>
            {variable.map(x => (
              <ExpenseRow key={x.id} item={x} amountColor="#FCD34D"
                onDelete={async (id) => { await deleteVariableExp(id); setVariable(v => v.filter(i => i.id !== id)); }} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Main Finance page ─────────────────────────────────────────────────────────
export default function Finance() {
  const today    = new Date();
  const [month, setMonth]   = useState(toMonthStr(today));
  const [tab, setTab]       = useState("income");
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

      {/* Monthly summary */}
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
          <div style={{ backgroundColor: "rgba(255,255,255,0.06)" }} className="rounded-full h-2 relative overflow-hidden">
            <div style={{
              width: summary.total_income > 0
                ? `${Math.min((summary.total_income / (summary.total_income + summary.total_expenses)) * 100, 100)}%`
                : "0%",
              backgroundColor: "#00E5CC",
              transition: "width 0.6s ease"
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

      {/* Content */}
      {tab === "income"   && <IncomeTab   month={month} />}
      {tab === "expenses" && <ExpensesTab month={month} />}
    </div>
  );
}