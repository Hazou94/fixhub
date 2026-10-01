import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import IncidentForm from "@/components/client/IncidentForm";
import { Phone } from "lucide-react";

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ hotelSlug: string; roomNumber: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { hotelSlug, roomNumber } = await params;
  const { token } = await searchParams;

  const supabase = createServiceClient();

  // Find the hotel
  const { data: hotel } = await supabase
    .from("hotels")
    .select("id, name, logo_url, subscription_status, emergency_phone")
    .eq("slug", hotelSlug)
    .single();

  if (!hotel) notFound();

  // Subscription suspended?
  if (hotel.subscription_status === "cancelled") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔧</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Service temporairement indisponible</h1>
          <p className="text-gray-500 text-sm mb-6">Veuillez contacter la réception directement.</p>
          {hotel.emergency_phone && (
            <a
              href={`tel:${hotel.emergency_phone}`}
              className="flex items-center justify-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-xl font-medium"
            >
              <Phone className="w-5 h-5" />
              Appeler la réception
            </a>
          )}
        </div>
      </div>
    );
  }

  // Find the room (by token or by room number)
  let roomQuery = supabase.from("rooms").select("id, room_number").eq("hotel_id", hotel.id);

  if (token) {
    const { data: qr } = await supabase
      .from("qr_codes")
      .select("room_id")
      .eq("token", token)
      .eq("is_active", true)
      .single();
    if (qr) {
      roomQuery = roomQuery.eq("id", qr.room_id);
    } else {
      roomQuery = roomQuery.eq("room_number", decodeURIComponent(roomNumber));
    }
    // Increment scan counter
    try { await supabase.rpc("increment_qr_scan", { p_token: token }); } catch {};
  } else {
    roomQuery = roomQuery.eq("room_number", decodeURIComponent(roomNumber));
  }

  const { data: room } = await roomQuery.eq("is_active", true).single();
  if (!room) notFound();

  // Load categories + locations
  const { data: categories } = await supabase
    .from("incident_categories")
    .select("id, name_fr, name_en, icon, default_priority")
    .eq("is_active", true)
    .order("name_fr");

  const { data: locations } = await supabase
    .from("room_locations")
    .select("id, name_fr")
    .order("name_fr");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          {hotel.logo_url ? (
            <img src={hotel.logo_url} alt={hotel.name} className="h-10 mb-2 rounded" />
          ) : (
            <h1 className="text-xl font-bold">{hotel.name}</h1>
          )}
          <p className="text-brand-200 text-sm">
            Chambre {room.room_number} — Signalement d'incident
          </p>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-lg mx-auto p-4">
        <IncidentForm
          hotelId={hotel.id}
          roomId={room.id}
          roomNumber={room.room_number}
          categories={categories ?? []}
          locations={locations ?? []}
        />
      </div>
    </div>
  );
}
