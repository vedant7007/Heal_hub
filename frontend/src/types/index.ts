export interface Doctor {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  hospital: string;
  created_at: string;
}

export interface FamilyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  taken_count: number;
  total_count: number;
}

export interface CheckinSchedule {
  days: number[];
  time: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  language_preference: string;
  surgery_type: string;
  surgery_date: string;
  hospital: string;
  doctor_id: string;
  family_contacts: FamilyContact[];
  checkin_schedule: CheckinSchedule;
  current_status: "green" | "yellow" | "red" | "critical";
  risk_score: number;
  medicines: Medicine[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  days_since_surgery: number;
  checkins?: CheckIn[];
  conversations?: Message[];
}

export interface CheckinResponse {
  question: string;
  answer: string;
  answer_type: string;
  original_language: string;
  translated_answer: string;
  timestamp: string;
}

export interface WoundAnalysis {
  description: string;
  risk_level: string;
  confidence: number;
}

export interface AIAssessment {
  risk_level: string;
  risk_score: number;
  reasoning: string;
  recommended_action: string;
}

export interface CheckIn {
  id: string;
  patient_id: string;
  day_number: number;
  type: string;
  questions_asked: string[];
  responses: CheckinResponse[];
  pain_score: number | null;
  symptoms_detected: string[];
  wound_photo_url: string | null;
  wound_analysis: WoundAnalysis | null;
  medicine_taken: boolean | null;
  ai_assessment: AIAssessment;
  escalation_triggered: boolean;
  escalation_level: number | null;
  created_at: string;
}

export interface Alert {
  id: string;
  patient_id: string;
  doctor_id: string;
  checkin_id: string;
  level: number;
  title: string;
  description: string;
  ai_reasoning: string;
  symptoms: string[];
  status: "new" | "seen" | "acknowledged" | "resolved";
  resolved_at: string | null;
  created_at: string;
  patient_name: string;
}

export interface Message {
  role: "ai" | "patient";
  content: string;
  content_type: string;
  media_url?: string;
  language: string;
  timestamp: string;
}

export interface OverviewStats {
  total_patients: number;
  active_alerts: number;
  avg_recovery_score: number;
  checkins_today: number;
  status_distribution: Record<string, number>;
}
