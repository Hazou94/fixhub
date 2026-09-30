import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HotelSettingsForm from "@/components/hotel/HotelSettingsForm";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: hotelUser } = await supabase
    .from("hotel_users")
    .select("hotel_id, role")
    .eq("user_id", user.id)
    .single();
  if (!hotelUser || hotelUser.role !== "hotel_admin") redirect("/hotel/dashboard");

  const { data: hotel } = await supabase
    .from("hotels")
    .select("*")
    .eq("id", hotelUser.hotel_id)
    .single();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres de l'hôtel</h1>
      <HotelSettingsForm hotel={hotel} />
    </div>
  );
}
