export type IncidentStatus =
  | "new"
  | "acknowledged"
  | "assigned"
  | "in_progress"
  | "waiting_parts"
  | "waiting_provider"
  | "resolved"
  | "closed"
  | "cancelled";

export type IncidentPriority = "low" | "medium" | "high" | "critical";
export type UserRole = "hotel_admin" | "manager" | "technician" | "receptionist";
export type AccessPreference = "anytime" | "morning" | "afternoon" | "evening" | "notify_first";

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  new: "Nouveau",
  acknowledged: "Pris en compte",
  assigned: "Assigné",
  in_progress: "En cours",
  waiting_parts: "Attente pièces",
  waiting_provider: "Attente prestataire",
  resolved: "Résolu",
  closed: "Clôturé",
  cancelled: "Annulé",
};

export const STATUS_COLORS: Record<IncidentStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  acknowledged: "bg-purple-100 text-purple-800",
  assigned: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  waiting_parts: "bg-orange-100 text-orange-800",
  waiting_provider: "bg-pink-100 text-pink-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  low: "Basse",
  medium: "Normale",
  high: "Haute",
  critical: "Critique",
};

export const ACCESS_LABELS: Record<AccessPreference, string> = {
  anytime: "À tout moment",
  morning: "Matin (8h-12h)",
  afternoon: "Après-midi (12h-18h)",
  evening: "Soir (18h-22h)",
  notify_first: "Me prévenir avant",
};

export interface Hotel {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  logo_url?: string;
  emergency_phone?: string;
  subscription_plan_id?: string;
  subscription_status: "trialing" | "active" | "past_due" | "cancelled";
  trial_ends_at?: string;
  created_at: string;
}

export interface Room {
  id: string;
  hotel_id: string;
  room_number: string;
  floor?: number;
  room_type?: string;
  is_active: boolean;
}

export interface IncidentCategory {
  id: string;
  name_fr: string;
  name_en: string;
  icon: string;
  default_priority: IncidentPriority;
  default_escalation_hours: number;
}

export interface Incident {
  id: string;
  hotel_id: string;
  room_id: string;
  category_id: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  title: string;
  description?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  access_preference: AccessPreference;
  tracking_token: string;
  assigned_to?: string;
  resolved_at?: string;
  resolution_notes?: string;
  next_escalation_at?: string;
  acknowledged_at?: string;
  assigned_at?: string;
  in_progress_at?: string;
  created_at: string;
  updated_at: string;
  // joined
  room?: Room;
  category?: IncidentCategory;
  photos?: IncidentPhoto[];
  assignee?: Profile;
}

export interface IncidentPhoto {
  id: string;
  incident_id: string;
  storage_path: string;
  public_url: string;
  uploaded_by?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  language: string;
}

export interface HotelUser {
  user_id: string;
  hotel_id: string;
  role: UserRole;
  is_active: boolean;
  profile: Profile;
}

export interface ServiceProvider {
  id: string;
  hotel_id?: string;
  company_name: string;
  contact_name: string;
  email?: string;
  phone: string;
  is_global: boolean;
  average_rating?: number;
}

export interface ProviderQuote {
  id: string;
  incident_id: string;
  provider_id: string;
  status: "pending" | "accepted" | "declined" | "expired";
  amount?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  notes?: string;
  response_token: string;
  expires_at: string;
  created_at: string;
  provider?: ServiceProvider;
}

export interface Evaluation {
  id: string;
  incident_id: string;
  guest_rating?: number;
  guest_comment?: string;
  evaluation_token: string;
  submitted_at?: string;
}

export interface Notification {
  id: string;
  hotel_id: string;
  user_id: string;
  incident_id?: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
