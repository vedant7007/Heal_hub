import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// JWT interceptor
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("healhub_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth
export const login = (email: string, password: string) =>
  api.post("/api/auth/login", { email, password });

export const register = (data: Record<string, string>) =>
  api.post("/api/auth/register", data);

export const getMe = () => api.get("/api/auth/me");

// Patients
export const getPatients = (params?: Record<string, string>) =>
  api.get("/api/patients", { params });

export const getPatient = (id: string) => api.get(`/api/patients/${id}`);

export const createPatient = (data: Record<string, unknown>) =>
  api.post("/api/patients", data);

export const updatePatient = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/patients/${id}`, data);

export const deletePatient = (id: string) => api.delete(`/api/patients/${id}`);

export const sendMessage = (id: string, message: string) =>
  api.post(`/api/patients/${id}/message`, { message });

export const callPatient = (id: string) =>
  api.post(`/api/patients/${id}/call`);

export const setHandoffMode = (id: string, mode: "ai" | "doctor") =>
  api.post(`/api/patients/${id}/handoff`, { mode });

export const doctorReply = (id: string, message: string) =>
  api.post(`/api/patients/${id}/reply`, { message });

// Check-ins
export const getCheckins = (patientId: string) =>
  api.get(`/api/checkins/${patientId}`);

// Alerts
export const getAlerts = (params?: Record<string, string>) =>
  api.get("/api/alerts", { params });

export const getActiveAlerts = () => api.get("/api/alerts/active");

export const updateAlert = (id: string, data: Record<string, string>) =>
  api.put(`/api/alerts/${id}`, data);

// Analytics
export const getOverview = () => api.get("/api/analytics/overview");

export const getRecoveryTrends = () => api.get("/api/analytics/recovery-trends");

export const getComplications = () => api.get("/api/analytics/complications");

export const getResponseRates = () => api.get("/api/analytics/response-rates");

export default api;
