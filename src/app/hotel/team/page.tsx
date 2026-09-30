import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserCircle } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  hotel_admin: "Administrateur",
  manager: "Manager",
  technician: "Technicien",
  receptionist: "Réceptionniste",
};

export default async function TeamPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: hotelUser } = await supabase
    .from("hotel_users")
    .select("hotel_id, role")
    .eq("user_id", user.id)
    .single();
  if (!hotelUser || hotelUser.role !== "hotel_admin") redirect("/hotel/dashboard");

  const { data: team } = await supabase
    .from("hotel_users")
    .select("user_id, role, is_active, profiles(full_name, phone)")
    .eq("hotel_id", hotelUser.hotel_id)
    .order("role");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
        <p className="text-sm text-gray-500 mt-1">Membres de votre équipe ayant accès à FixHub.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {team?.map((member) => {
          const profile = member.profiles as { full_name: string; phone?: string } | null;
          return (
            <div key={member.user_id} className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                <UserCircle className="w-6 h-6 text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name ?? "—"}</p>
                {profile?.phone && <p className="text-xs text-gray-500">{profile.phone}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full font-medium">
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
                {!member.is_active && (
                  <span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full">Inactif</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        Pour inviter un nouveau membre, utilisez Supabase Auth → Inviter un utilisateur, puis associez-le à votre hôtel via la table <code className="bg-blue-100 px-1 rounded">hotel_users</code>.
      </div>
    </div>
  );
}
