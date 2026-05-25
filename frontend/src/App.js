import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Coaches from "./pages/Coaches";
import Sessions from "./pages/Sessions";
import Kids from "./pages/Kids";
import Attendance from "./pages/Attendance";
import Analytics from "./pages/Analytics";
import Payments from "./pages/Payments";
import CoachPortal from "./pages/CoachPortal";
import Navbar from "./components/Navbar";
import CalendarPage from "./pages/Calendar";
import Users from "./pages/Users";

function PrivateRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute><AdminDashboard /></PrivateRoute>
        } />
        <Route path="/coaches" element={
          <PrivateRoute role="admin"><Coaches /></PrivateRoute>
        } />
        <Route path="/sessions" element={
          <PrivateRoute role="admin"><Sessions /></PrivateRoute>
        } />
        <Route path="/kids" element={
          <PrivateRoute role="admin"><Kids /></PrivateRoute>
        } />
        <Route path="/attendance" element={
          <PrivateRoute><Attendance /></PrivateRoute>
        } />
        <Route path="/analytics" element={
          <PrivateRoute><Analytics /></PrivateRoute>
        } />
        <Route path="/payments" element={
          <PrivateRoute role="admin"><Payments /></PrivateRoute>
        } />
        <Route path="/coach-portal" element={
          <PrivateRoute role="coach"><CoachPortal /></PrivateRoute>
        } />
        <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute role="admin"><Users /></PrivateRoute>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}