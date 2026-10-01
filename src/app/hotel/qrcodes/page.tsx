import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import QrCodesClient from "@/components/hotel/QrCodesClient";

export default async function QrCodesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: hotelUser } = await supabase
    .from("hotel_users")
    .select("hotel_id, role, hotels(slug)")
    .eq("user_id", user.id)
    .single();
  if (!hotelUser || !["hotel_admin", "manager"].includes(hotelUser.role)) redirect("/hotel/dashboard");

  const hotel = hotelUser.hotels as unknown as { slug: string };

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, room_number, floor, room_type")
    .eq("hotel_id", hotelUser.hotel_id)
    .eq("is_active", true)
    .order("room_number");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">QR Codes</h1>
        <p className="text-sm text-gray-500 mt-1">Générez et imprimez les QR codes à placer dans chaque chambre.</p>
      </div>
      <QrCodesClient rooms={rooms ?? []} hotelSlug={hotel.slug} hotelId={hotelUser.hotel_id} />
    </div>
  );
}
