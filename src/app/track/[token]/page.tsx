import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";
import type { IncidentStatus } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle, Clock, Wrench, Star } from "lucide-react";

const STEPS: { status: IncidentStatus[]; label: string; icon: React.ReactNode }[] = [
  { status: ["new"], label: "Reçu", icon: <CheckCircle className="w-4 h-4" /> },
  { status: ["acknowledged"], label: "Pris en compte", icon: <Clock className="w-4 h-4" /> },
  { status: ["assigned", "in_progress", "waiting_parts", "waiting_provider"], label: "En traitement", icon: <Wrench className="w-4 h-4" /> },
  { status: ["resolved"], label: "Résolu", icon: <CheckCircle className="w-4 h-4" /> },
  { status: ["closed"], label: "Clôturé", icon: <Star className="w-4 h-4" /> },
];

function getStepIndex(status: IncidentStatus): number {
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i].status.includes(status)) return i;
  }
  return 0;
}

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: incident } = await supabase
    .from("incidents")
    .select("*, rooms(room_number), incident_categories(name_fr, icon), hotels(name, emergency_phone), incident_photos(public_url), evaluations(guest_rating, guest_comment, submitted_at)")
    .eq("tracking_token", token)
    .single();

  if (!incident) notFound();

  const { data: history } = await supabase
    .from("incident_status_history")
    .select("new_status, note, created_at")
    .eq("incident_id", incident.id)
    .order("created_at", { ascending: true });

  const hotel = incident.hotels as unknown as { name: string; emergency_phone?: string };
  const room = incident.rooms as unknown as { room_number: string };
  const cat = incident.incident_categories as unknown as { name_fr: string; icon: string };
  const photos = incident.incident_photos as unknown as { public_url: string }[];
  const evaluation = (incident.evaluations as unknown as { guest_rating?: number; guest_comment?: string; submitted_at?: string }[])?.[0];

  const currentStep = getStepIndex(incident.status as IncidentStatus);
  const isCancelled = incident.status === "cancelled";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <h1 className="font-bold text-lg">{hotel?.name}</h1>
          <p className="text-brand-200 text-sm">Suivi — Chambre {room?.room_number}</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Status badge */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-2xl mb-1">{cat?.icon}</div>
              <h2 className="font-semibold text-gray-900">{incident.title}</h2>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${
              isCancelled ? "bg-red-100 text-red-700" : STATUS_COLORS[incident.status as IncidentStatus]
            }`}>
              {STATUS_LABELS[incident.status as IncidentStatus]}
            </span>
          </div>

          {/* Progress bar */}
          {!isCancelled && (
            <div className="flex items-center gap-2">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs shrink-0 ${
                    i <= currentStep ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    {step.icon}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 ${i < currentStep ? "bg-brand-500" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Photos */}
        {photos && photos.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Photos</h3>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <img key={i} src={p.public_url} alt="" className="w-full h-24 object-cover rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Resolution notes */}
        {incident.resolution_notes && (
          <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
            <h3 className="font-semibold text-green-800 mb-2">Note de résolution</h3>
            <p className="text-sm text-green-700">{incident.resolution_notes}</p>
          </div>
        )}

        {/* Evaluation */}
        {evaluation?.submitted_at && (
          <div className="bg-yellow-50 rounded-2xl p-5 border border-yellow-100">
            <h3 className="font-semibold text-gray-900 mb-2">Votre évaluation</h3>
            <div className="text-2xl">{"⭐".repeat(evaluation.guest_rating ?? 0)}</div>
            {evaluation.guest_comment && (
              <p className="text-sm text-gray-600 mt-2 italic">"{evaluation.guest_comment}"</p>
            )}
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Historique</h3>
          <div className="space-y-3">
            {history?.map((h, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                  {i < (history.length - 1) && <div className="w-0.5 bg-gray-200 flex-1 mt-1" />}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-medium">{STATUS_LABELS[h.new_status as IncidentStatus]}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(h.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                  </p>
                  {h.note && <p className="text-xs text-gray-600 mt-0.5">{h.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency fallback */}
        {hotel?.emergency_phone && (
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">Besoin d'aide urgente ?</p>
            <a
              href={`tel:${hotel.emergency_phone}`}
              className="text-sm text-brand-500 font-medium hover:underline"
            >
              📞 Appeler la réception
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
