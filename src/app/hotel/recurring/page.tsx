import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";

export default async function RecurringPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: hotelUser } = await supabase
    .from("hotel_users")
    .select("hotel_id, role")
    .eq("user_id", user.id)
    .single();
  if (!hotelUser) redirect("/auth/login");

  const { data: recurring } = await supabase
    .from("recurring_issues")
    .select("*, rooms(room_number), incident_categories(name_fr, icon)")
    .eq("hotel_id", hotelUser.hotel_id)
    .order("occurrence_count", { ascending: false });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Problèmes récurrents</h1>
        <p className="text-sm text-gray-500 mt-1">Problèmes signalés 3 fois ou plus dans la même chambre sur 60 jours.</p>
      </div>

      {(!recurring || recurring.length === 0) && (
        <div className="bg-green-50 text-green-700 rounded-xl p-8 text-center">
          <div className="text-3xl mb-2">✅</div>
          Aucun problème récurrent détecté. Excellent !
        </div>
      )}

      <div className="space-y-3">
        {recurring?.map((r) => {
          const room = r.rooms as { room_number: string };
          const cat = r.incident_categories as { name_fr: string; icon: string };
          const severity = r.occurrence_count >= 5 ? "high" : "medium";
          return (
            <div
              key={r.id}
              className={`bg-white rounded-xl p-5 shadow-sm border ${severity === "high" ? "border-red-200" : "border-orange-100"}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${severity === "high" ? "bg-red-50" : "bg-orange-50"}`}>
                  {cat?.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">Chambre {room?.room_number} — {cat?.name_fr}</h3>
                    {severity === "high" && (
                      <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Critique
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-500">
                    <span><strong className="text-orange-600">{r.occurrence_count}</strong> occurrences (60 jours)</span>
                    <span>1ère fois : {format(new Date(r.first_occurrence), "d MMM yyyy", { locale: fr })}</span>
                    <span>Dernière : {format(new Date(r.last_occurrence), "d MMM yyyy", { locale: fr })}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    💡 Recommandation : prévoir une inspection complète de la chambre {room?.room_number} pour ce type de problème.
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
