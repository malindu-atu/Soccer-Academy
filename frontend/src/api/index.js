import axios from "axios";
import { createClient } from "@supabase/supabase-js";

// Supabase client for auth only
export const supabase = createClient(
  "https://tdyznraszanwxtqsgrff.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeXpucmFzemFud3h0cXNncmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODcwNzAsImV4cCI6MjA5MDA2MzA3MH0.aGpCGR2u9RXWgWRuyg59ovDjbPBZxuIdA6dTat8mTD0"
);

const api = axios.create({ 
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api" 
});

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.access_token) config.headers.Authorization = `Bearer ${user.access_token}`;
  return config;
});

// Auth — sign in via Supabase, then fetch role from backend
export const loginApi = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const access_token = data.session.access_token;
  const meRes = await api.post("/auth/me", { access_token });
  return { data: { ...meRes.data, access_token } };
};

export const logoutApi = async () => {
  await supabase.auth.signOut();
};

// Coaches
export const getCoaches = () => api.get("/coaches");
export const createCoach = (data) => api.post("/coaches", data);
export const updateCoach = (id, data) => api.put(`/coaches/${id}`, data);
export const deleteCoach = (id) => api.delete(`/coaches/${id}`);
export const addAvailability = (data) => api.post("/coaches/availability", data);
export const getAvailability = (id) => api.get(`/coaches/availability/${id}`);

// Sessions
export const getSessions = () => api.get("/sessions");
export const createSession = (data) => api.post("/sessions", data);
export const updateSession = (id, data) => api.put(`/sessions/${id}`, data);
export const getUnassignedSessions = () => api.get("/sessions/unassigned");

// Kids
export const getKids = (params = {}) => api.get("/kids", { params });
export const getKidsByAgeGroup = (ag) => api.get(`/kids/age-group/${ag}`);
export const createKid = (data) => api.post("/kids", data);

// Attendance
export const markAttendance = (data) => api.post("/attendance/bulk", data);
export const getSessionAttendance = (id) => api.get(`/attendance/session/${id}`);
export const getKidAttendance = (id) => api.get(`/attendance/kid/${id}`);

// Notifications
export const getNotifications = (id) => api.get(`/notifications/${id}`);
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);

// Analytics
export const getOverviewAnalytics = () => api.get("/analytics/overview");
export const getCoachAnalytics = (id) => api.get(`/analytics/coach/${id}`);
export const getStudentAnalytics = (id) => api.get(`/analytics/student/${id}`);
export const getAgeGroupAnalytics = () => api.get("/analytics/age-group");
export const getLocationAnalytics = () => api.get("/analytics/location");
export const getRetentionAnalytics = () => api.get("/analytics/retention");


// Add with the other auth exports
export const createUser = (data) => api.post("/auth/create-user", data);
// Locations
export const getLocations = () => api.get("/locations");