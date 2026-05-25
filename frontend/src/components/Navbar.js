import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Users, CalendarDays, GraduationCap,
  ClipboardCheck, CreditCard, BarChart3, LogOut, UserCog, Calendar, DollarSign
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/",          label: "Dashboard", icon: LayoutDashboard },
  { to: "/coaches",   label: "Coaches",   icon: Users           },
  { to: "/sessions",  label: "Sessions",  icon: CalendarDays    },
  { to: "/kids",      label: "Students",  icon: GraduationCap   },
  { to: "/attendance",label: "Attendance",icon: ClipboardCheck  },
  { to: "/finance", label: "Finance", icon: DollarSign },
  { to: "/analytics", label: "Analytics", icon: BarChart3       },
  { to: "/calendar",  label: "Calendar",  icon: Calendar        },
  { to: "/users",     label: "Users",     icon: UserCog         },
];

const COACH_ITEMS = [
  { to: "/coach-portal", label: "My Portal",  icon: LayoutDashboard },
  { to: "/attendance",   label: "Attendance", icon: ClipboardCheck  },
  { to: "/calendar",     label: "Calendar",   icon: Calendar        },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate("/login"); };
  const isActive = (path) => location.pathname === path;

  const items = user?.role === "admin" ? NAV_ITEMS : COACH_ITEMS;

  return (
    <nav
      style={{
        backgroundColor: "#080F1E",
        borderBottom: "1px solid rgba(0,229,204,0.12)",
        backdropFilter: "blur(12px)",
      }}
      className="px-5 py-0 flex items-center justify-between sticky top-0 z-50 h-14"
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
        <div>
          <img src="/logo512.jpg" alt="FBL" className="h-10 w-auto"/>
        </div>
        <span className="font-extrabold text-white text-base tracking-tight">
          FBL<span style={{ color: "#00E5CC" }}>.</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {items.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap"
              style={active
                ? { backgroundColor: "rgba(0,229,204,0.15)", color: "#00E5CC" }
                : { color: "#6B7280" }
              }
            >
              <Icon size={14} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* User + logout */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-medium text-white leading-tight">
            {user?.profile
              ? `${user.profile.first_name} ${user.profile.last_name}`.trim()
              : user?.coach?.name || "Admin"}
          </p>
          <p className="text-xs" style={{ color: "#00E5CC" }}>{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#9CA3AF" }}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all"
          title="Logout"
        >
          <LogOut size={15} />
        </button>
      </div>
    </nav>
  );
}