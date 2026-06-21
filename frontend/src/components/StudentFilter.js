import { input } from "./UI";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";

const AGE_GROUPS = ["U7", "U13", "U12_DEV", "U13_GIRLS"];
const AGE_GROUP_LABELS = { U7: "U7", U13: "U13", U12_DEV: "U12 Development", U13_GIRLS: "U13 Girls" };

export default function StudentFilter({
  search = "", onSearch,
  ageFilter = "", onAge,
  locationFilter = "", onLocation,
  locations = [],
  resultCount,
  children,
}) {
  const hasFilter = search || ageFilter || locationFilter;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[150px] max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          style={input}
          className="w-full rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          placeholder="Search student…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      {/* Age group */}
      <div className="relative">
        <select
          style={{ ...input, backgroundImage: "none", paddingRight: "28px" }}
          className="rounded-lg pl-3 pr-7 py-2 text-sm focus:outline-none appearance-none cursor-pointer"
          value={ageFilter}
          onChange={e => onAge(e.target.value)}
        >
          <option value="" style={{ backgroundColor: "#0D1F3C" }}>All Ages</option>
          {AGE_GROUPS.map(g => (
            <option key={g} value={g} style={{ backgroundColor: "#0D1F3C" }}>{AGE_GROUP_LABELS[g]}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>

      {/* Location */}
      {locations.length > 0 && (
        <div className="relative">
          <select
            style={{ ...input, backgroundImage: "none", paddingRight: "28px" }}
            className="rounded-lg pl-3 pr-7 py-2 text-sm focus:outline-none appearance-none cursor-pointer"
            value={locationFilter}
            onChange={e => onLocation(e.target.value)}
          >
            <option value="" style={{ backgroundColor: "#0D1F3C" }}>All Locations</option>
            {locations.map(l => (
              <option key={l.id} value={l.id} style={{ backgroundColor: "#0D1F3C" }}>{l.name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      )}

      {/* Clear */}
      {hasFilter && (
        <button
          onClick={() => { onSearch(""); onAge(""); onLocation(""); }}
          style={{ color: "#6B7280", border: "1px solid rgba(255,255,255,0.07)" }}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs hover:text-white transition-all"
        >
          <X size={12} /> Clear
        </button>
      )}

      {resultCount !== undefined && (
        <span className="text-gray-600 text-xs ml-1">{resultCount} student{resultCount !== 1 ? "s" : ""}</span>
      )}

      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}