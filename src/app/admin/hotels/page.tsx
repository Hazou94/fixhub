import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function AdminHotelsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "super_admin") redirect("/hotel/dashboard");

  const { data: hotels } = await supabase
    .from("hotels")
    .select("*, subscription_plans(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tous les hôtels</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left p-4 font-medium text-gray-700">Hôtel</th>
              <th className="text-left p-4 font-medium text-gray-700">Ville</th>
              <th className="text-left p-4 font-medium text-gray-700">Plan</th>
              <th className="text-left p-4 font-medium text-gray-700">Statut</th>
              <th className="text-left p-4 font-medium text-gray-700">Créé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {hotels?.map((h) => {
              const plan = h.subscription_plans as { name: string } | null;
              return (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium text-gray-900">{h.name}</p>
                    <p className="text-xs text-gray-400">{h.slug}</p>
                  </td>
                  <td className="p-4 text-gray-600">{h.city}, {h.country}</td>
                  <td className="p-4 text-gray-600">{plan?.name ?? "—"}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      h.subscription_status === "active" ? "bg-green-100 text-green-700" :
                      h.subscription_status === "trialing" ? "bg-blue-100 text-blue-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {h.subscription_status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 text-xs">
                    {format(new Date(h.created_at), "d MMM yyyy", { locale: fr })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
