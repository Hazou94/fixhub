import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Star, Phone, Mail, Wrench } from "lucide-react";

export default async function ProvidersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: hotelUser } = await supabase
    .from("hotel_users")
    .select("hotel_id, role")
    .eq("user_id", user.id)
    .single();
  if (!hotelUser || !["hotel_admin", "manager"].includes(hotelUser.role)) redirect("/hotel/dashboard");

  const { data: providers } = await supabase
    .from("service_providers")
    .select("*, provider_skills(skills(name_fr))")
    .or(`hotel_id.eq.${hotelUser.hotel_id},is_global.eq.true`)
    .order("is_global")
    .order("company_name");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prestataires</h1>
        <p className="text-sm text-gray-500 mt-1">Vos prestataires et les prestataires globaux FixHub disponibles.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers?.map((p) => {
          const skills = (p.provider_skills as unknown as { skills: { name_fr: string } | null }[])
            ?.map((ps) => ps.skills?.name_fr)
            .filter(Boolean);
          return (
            <div key={p.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.company_name}</h3>
                  <p className="text-sm text-gray-500">{p.contact_name}</p>
                </div>
                {p.is_global && (
                  <span className="bg-brand-50 text-brand-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    Global
                  </span>
                )}
              </div>

              {p.average_rating && (
                <div className="flex items-center gap-1 text-sm text-yellow-600 mb-3">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  <span className="font-medium">{Number(p.average_rating).toFixed(1)}</span>
                </div>
              )}

              {skills && skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {skills.map((s) => (
                    <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      <Wrench className="w-2.5 h-2.5 inline mr-1" />{s}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-brand-500">
                    <Phone className="w-3.5 h-3.5" />{p.phone}
                  </a>
                )}
                {p.email && (
                  <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-brand-500">
                    <Mail className="w-3.5 h-3.5" />{p.email}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(!providers || providers.length === 0) && (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400">
          Aucun prestataire configuré
        </div>
      )}
    </div>
  );
}
