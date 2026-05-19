import { useEffect, useRef, useState } from "react";
import { Trash2, Pencil, X, Check, MapPin } from 'lucide-react';
import { getKids, createKid } from "../api";
import { pageWrapper, card, input, btnPrimary, btnOutline } from "../components/UI";
import StudentFilter from "../components/StudentFilter";
import axios from "axios";

const AGE_GROUPS = ["U6","U7","U8","U9","U10","U11","U12","U13","U14","U15","U16"];

const EMPTY_FORM = {
  name: "", date_of_birth: "", age_group: "U6",
  parent_name: "", parent_contact: "", enrollment_date: "", location_id: ""
};

const api2 = axios.create({ baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api" });
api2.interceptors.request.use(c => {
  const u = JSON.parse(localStorage.getItem("user"));
  if (u?.access_token) c.headers.Authorization = `Bearer ${u.access_token}`;
  return c;
});
const getLocations = () => api2.get("/locations");
const updateKid    = (id, data) => api2.put(`/kids/${id}`, data);
const deleteKid    = (id)       => api2.delete(`/kids/${id}`);

// ── Enrollment scanner ─────────────────────────────────────────────────────
function EnrollmentScanner({ onExtracted, onSkip }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const handleFile = (f) => { if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)); setError(""); };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };

  const handleScan = async () => {
    if (!file) return;
    setScanning(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://localhost:8000/api"}/kids/extract-enrollment`,
        formData, { headers: { "Content-Type": "multipart/form-data" } }
      );
      onExtracted(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to scan document. Please try again.");
    } finally { setScanning(false); }
  };

  return (
    <div style={card} className="rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div style={{ backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg">📄</div>
        <div>
          <h2 className="font-semibold text-white text-base">Upload Enrollment Document</h2>
          <p className="text-gray-400 text-xs mt-0.5">AI will auto-fill student details from the document</p>
        </div>
      </div>
      <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop} onClick={() => fileRef.current.click()}
        style={{ border: `2px dashed ${dragOver ? "#00E5CC" : "rgba(0,229,204,0.25)"}`, backgroundColor: dragOver ? "rgba(0,229,204,0.05)" : "rgba(0,0,0,0.2)", cursor: "pointer" }}
        className="rounded-xl p-6 flex flex-col items-center justify-center gap-3 mb-4">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        {preview
          ? <img src={preview} alt="preview" className="max-h-52 rounded-lg object-contain border border-white/10" />
          : <>
              <div style={{ color: "#00E5CC" }} className="text-4xl">📁</div>
              <p className="text-gray-300 text-sm font-medium">Drop document image here or click to browse</p>
              <p className="text-gray-500 text-xs">JPG, PNG, WEBP supported</p>
            </>
        }
      </div>
      {error && <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }} className="rounded-lg p-3 mb-4 text-red-400 text-sm">⚠️ {error}</div>}
      <div className="flex gap-3">
        <button onClick={handleScan} disabled={!file || scanning}
          style={file && !scanning ? btnPrimary : { backgroundColor: "rgba(0,229,204,0.3)", color: "#0A1628" }}
          className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2">
          {scanning ? <><span className="animate-spin">⟳</span> Scanning…</> : "Scan & Auto-fill"}
        </button>
        <button onClick={onSkip} style={btnOutline} className="px-5 py-3 rounded-lg font-semibold text-sm transition-all">Skip</button>
      </div>
    </div>
  );
}

// ── Location select field ──────────────────────────────────────────────────
function LocationSelect({ value, onChange, locations }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1.5 block">
        <span className="flex items-center gap-1"><MapPin size={11} /> Location</span>
      </label>
      <select
        style={{ ...input, backgroundImage: "none" }}
        className="w-full rounded-lg p-3 text-sm focus:outline-none"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="" style={{ backgroundColor: "#0D1F3C" }}>— No location —</option>
        {locations.map(l => (
          <option key={l.id} value={l.id} style={{ backgroundColor: "#0D1F3C" }}>{l.name}</option>
        ))}
      </select>
    </div>
  );
}

// ── Edit modal ─────────────────────────────────────────────────────────────
function EditModal({ kid, locations, onSave, onClose }) {
  const [form, setForm] = useState({
    name: kid.name || "",
    date_of_birth: kid.date_of_birth || "",
    age_group: kid.age_group || "U6",
    parent_name: kid.parent_name || "",
    parent_contact: kid.parent_contact || "",
    enrollment_date: kid.enrollment_date || "",
    location_id: kid.location_id || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(kid.id, form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(0,229,204,0.25)", maxWidth: 540, width: "100%" }}
        className="rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div style={{ backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm">
              {kid.name.charAt(0)}
            </div>
            <div>
              <p className="text-white font-semibold">Edit Student</p>
              <p className="text-gray-400 text-xs">{kid.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {[
            { label: "Full Name *", key: "name", required: true },
            { label: "Date of Birth", key: "date_of_birth", type: "date" },
            { label: "Parent Name", key: "parent_name" },
            { label: "Parent Contact", key: "parent_contact" },
            { label: "Enrollment Date", key: "enrollment_date", type: "date" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 mb-1.5 block">{f.label}</label>
              <input style={input}
                className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                type={f.type || "text"} value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                required={f.required} />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Age Group</label>
            <select style={{ ...input, backgroundImage: "none" }}
              className="w-full rounded-lg p-3 text-sm focus:outline-none"
              value={form.age_group} onChange={e => setForm({ ...form, age_group: e.target.value })}>
              {AGE_GROUPS.map(g => <option key={g} style={{ backgroundColor: "#0D1F3C" }}>{g}</option>)}
            </select>
          </div>

          {/* Location — spans full width */}
          <div className="sm:col-span-2">
            <LocationSelect
              value={form.location_id}
              onChange={v => setForm({ ...form, location_id: v })}
              locations={locations}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} style={btnPrimary}
            className="flex-1 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <Check size={14} /> {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={onClose}
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF" }}
            className="px-5 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Kids() {
  const [kids, setKids] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(null);
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [editKid, setEditKid] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadKids = (ag = ageFilter, loc = locationFilter) => {
    setLoading(true);
    const params = {};
    if (ag) params.age_group = ag;
    if (loc) params.location_id = loc;
    getKids(params).then(r => { setKids(r.data); setLoading(false); });
  };

  useEffect(() => {
    getLocations().then(r => setLocations(r.data));
    loadKids("", "");
  }, []);

  const handleAgeFilter      = (v) => { setAgeFilter(v);      loadKids(v, locationFilter); };
  const handleLocationFilter = (v) => { setLocationFilter(v); loadKids(ageFilter, v); };

  const handleExtracted = (data) => {
    setForm({
      name: data.name || "", date_of_birth: data.date_of_birth || "",
      age_group: AGE_GROUPS.includes(data.age_group) ? data.age_group : "U6",
      parent_name: data.parent_name || "", parent_contact: data.parent_contact || "",
      enrollment_date: data.enrollment_date || "", location_id: ""
    });
    setStep("form");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, location_id: form.location_id || null };
    await createKid(payload);
    loadKids();
    setForm(EMPTY_FORM);
    setStep(null);
  };

  const handleEdit = async (id, data) => {
    const payload = { ...data, location_id: data.location_id || null };
    await updateKid(id, payload);
    setEditKid(null);
    loadKids();
  };

  const handleDelete = async (id) => {
    await deleteKid(id);
    setDeleteConfirm(null);
    setKids(k => k.filter(x => x.id !== id));
  };

  const cancel = () => { setStep(null); setForm(EMPTY_FORM); };

  const filteredKids = kids.filter(k =>
    !search || k.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={pageWrapper} className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Students</h1>
          <p className="text-gray-400 mt-1 text-sm">Manage academy students across all age groups</p>
        </div>
        {step === null
          ? <button onClick={() => setStep("scan")} style={btnPrimary}
              className="px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-all whitespace-nowrap flex-shrink-0">
              + Add Student
            </button>
          : <button onClick={cancel} style={btnOutline}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap flex-shrink-0">
              ✕ Cancel
            </button>
        }
      </div>

      {step === "scan" && (
        <EnrollmentScanner onExtracted={handleExtracted} onSkip={() => { setForm(EMPTY_FORM); setStep("form"); }} />
      )}

      {step === "form" && (
        <div style={card} className="rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="font-semibold text-white">Student Details</h2>
            {form.name && (
              <span style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
                className="text-xs px-2 py-0.5 rounded-full">Auto-filled from document</span>
            )}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Full Name *", key: "name", placeholder: "Student name", required: true },
              { label: "Date of Birth", key: "date_of_birth", type: "date" },
              { label: "Parent Name", key: "parent_name", placeholder: "Parent / guardian name" },
              { label: "Parent Contact", key: "parent_contact", placeholder: "07XXXXXXXX" },
              { label: "Enrollment Date", key: "enrollment_date", type: "date" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-400 mb-1.5 block">{f.label}</label>
                <input style={input}
                  className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  type={f.type || "text"} placeholder={f.placeholder || ""} value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.required} />
              </div>
            ))}

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Age Group *</label>
              <select style={{ ...input, backgroundImage: "none" }}
                className="w-full rounded-lg p-3 text-sm focus:outline-none"
                value={form.age_group} onChange={e => setForm({ ...form, age_group: e.target.value })}>
                {AGE_GROUPS.map(g => <option key={g} style={{ backgroundColor: "#0D1F3C" }}>{g}</option>)}
              </select>
            </div>

            <div>
              <LocationSelect
                value={form.location_id}
                onChange={v => setForm({ ...form, location_id: v })}
                locations={locations}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 pt-1">
              <button style={btnPrimary}
                className="px-8 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-all" type="submit">
                ✓ Save Student
              </button>
              <button type="button" onClick={() => setStep("scan")} style={btnOutline}
                className="px-5 py-3 rounded-lg font-semibold text-sm transition-all">
                ← Re-scan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={card} className="rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <StudentFilter
            search={search} onSearch={setSearch}
            ageFilter={ageFilter} onAge={handleAgeFilter}
            locationFilter={locationFilter} onLocation={handleLocationFilter}
            locations={locations}
            resultCount={filteredKids.length}
          />
        </div>

        {/* Mobile */}
        <div className="block sm:hidden">
          {loading && <p className="p-6 text-center text-gray-500 text-sm">Loading…</p>}
          {filteredKids.map(k => (
            <div key={k.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div style={{ backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {k.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{k.name}</p>
                  <p className="text-gray-400 text-xs">{k.date_of_birth || "—"}</p>
                </div>
                <span style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
                  className="px-2 py-0.5 rounded-full text-xs flex-shrink-0">{k.age_group}</span>
              </div>
              <div className="ml-12 grid grid-cols-2 gap-1 text-xs text-gray-400 mb-1">
                <span>{k.parent_name || "—"}</span>
                <span>{k.parent_contact || "—"}</span>
                {k.enrollment_date && <span className="col-span-2">📅 {k.enrollment_date}</span>}
                {k.locations?.name && (
                  <span className="col-span-2 flex items-center gap-1">
                    <MapPin size={10} style={{ color: "#00E5CC" }} /> {k.locations.name}
                  </span>
                )}
              </div>
              <div className="ml-12 flex gap-2 mt-2">
                <button onClick={() => setEditKid(k)}
                  style={{ color: "#00E5CC", border: "1px solid rgba(0,229,204,0.25)" }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-cyan-500/10 transition-all">
                  <Pencil size={11} /> Edit
                </button>
                <button onClick={() => setDeleteConfirm(k.id)}
                  style={{ color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500/10 transition-all">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          ))}
          {!loading && filteredKids.length === 0 && <p className="p-8 text-center text-gray-500 text-sm">No students found.</p>}
        </div>

        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: "#0A1628" }}>
              <tr>
                {["Name","Age Group","Location","Date of Birth","Enrolled","Parent","Contact","Actions"].map(h => (
                  <th key={h} className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="p-8 text-center text-gray-500">Loading…</td></tr>}
              {filteredKids.map(k => (
                <tr key={k.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  className="hover:bg-white/2 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div style={{ backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                        {k.name.charAt(0)}
                      </div>
                      <span className="text-white font-medium">{k.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span style={{ backgroundColor: "rgba(0,229,204,0.1)", color: "#00E5CC" }}
                      className="px-2 py-0.5 rounded-full text-xs">{k.age_group}</span>
                  </td>
                  <td className="p-4">
                    {k.locations?.name
                      ? <span className="flex items-center gap-1 text-gray-300 text-sm">
                          <MapPin size={11} style={{ color: "#00E5CC" }} /> {k.locations.name}
                        </span>
                      : <span className="text-gray-600 text-sm">—</span>
                    }
                  </td>
                  <td className="p-4 text-gray-400 text-sm">{k.date_of_birth || "—"}</td>
                  <td className="p-4 text-gray-400 text-sm">{k.enrollment_date || "—"}</td>
                  <td className="p-4 text-gray-400 text-sm">{k.parent_name || "—"}</td>
                  <td className="p-4 text-gray-400 text-sm">{k.parent_contact || "—"}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => setEditKid(k)}
                        style={{ color: "#00E5CC", border: "1px solid rgba(0,229,204,0.25)" }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-cyan-500/10 transition-all">
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => setDeleteConfirm(k.id)}
                        style={{ color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500/10 transition-all">
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredKids.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editKid && (
        <EditModal kid={editKid} locations={locations} onSave={handleEdit} onClose={() => setEditKid(null)} />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (() => {
        const kid = kids.find(k => k.id === deleteConfirm);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.75)" }} onClick={() => setDeleteConfirm(null)}>
            <div style={{ backgroundColor: "#0D1F3C", border: "1px solid rgba(248,113,113,0.3)", maxWidth: 380, width: "100%" }}
              className="rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div style={{ backgroundColor: "rgba(248,113,113,0.15)", color: "#F87171" }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} />
                </div>
                <div>
                  <p className="text-white font-semibold">Remove Student</p>
                  <p className="text-gray-400 text-xs">This cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-5">
                Are you sure you want to remove <span className="text-white font-semibold">{kid?.name}</span>?
                They will be marked inactive and hidden from all lists.
              </p>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(deleteConfirm)}
                  style={{ backgroundColor: "rgba(248,113,113,0.15)", color: "#F87171", border: "1px solid rgba(248,113,113,0.3)" }}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-500/25 transition-all">
                  Yes, Remove
                </button>
                <button onClick={() => setDeleteConfirm(null)}
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF" }}
                  className="px-5 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}