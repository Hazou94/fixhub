import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users, AlertTriangle } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "super_admin") redirect("/hotel/dashboard");

  const [{ count: hotelCount }, { count: incidentCount }] = await Promise.all([
    supabase.from("hotels").select("*", { count: "exact", head: true }),
    supabase.from("incidents").select("*", { count: "exact", head: true })
      .not("status", "in", '("closed","cancelled")'),
  ]);

  const { data: recentHotels } = await supabase
    .from("hotels")
    .select("id, name, city, country, subscription_status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Super Admin</h1>
        <p className="text-gray-500 mt-1">Vue globale FixHub</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <Building2 className="w-8 h-8 text-brand-500 mb-3" />
          <div className="text-3xl font-bold">{hotelCount ?? 0}</div>
          <div className="text-gray-500 mt-1">Hôtels</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <AlertTriangle className="w-8 h-8 text-yellow-500 mb-3" />
          <div className="text-3xl font-bold">{incidentCount ?? 0}</div>
          <div className="text-gray-500 mt-1">Incidents actifs</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <Users className="w-8 h-8 text-green-500 mb-3" />
          <div className="text-3xl font-bold">—</div>
          <div className="text-gray-500 mt-1">Utilisateurs</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold">Hôtels récents</h2>
          <Link href="/admin/hotels" className="text-sm text-brand-500 hover:underline">Voir tous →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentHotels?.map((h) => (
            <div key={h.id} className="flex items-center gap-4 p-4">
              <div className="flex-1">
                <p className="font-medium">{h.name}</p>
                <p className="text-sm text-gray-500">{h.city}, {h.country}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                h.subscription_status === "active" ? "bg-green-100 text-green-700" :
                h.subscription_status === "trialing" ? "bg-blue-100 text-blue-700" :
                "bg-red-100 text-red-700"
              }`}>
                {h.subscription_status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
