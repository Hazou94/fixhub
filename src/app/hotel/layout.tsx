import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import HotelNav from "@/components/hotel/HotelNav";

export default async function HotelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: hotelUser } = await supabase
    .from("hotel_users")
    .select("hotel_id, role, hotels(id, name, logo_url, subscription_status, trial_ends_at)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!hotelUser) redirect("/auth/login");

  const hotel = hotelUser.hotels as unknown as { id: string; name: string; logo_url?: string; subscription_status: string; trial_ends_at?: string };

  return (
    <div className="flex h-screen" style={{ background: "#f4f6f7" }}>
      <HotelNav hotel={hotel} role={hotelUser.role} userId={user.id} isSuperAdmin={user.user_metadata?.role === "super_admin"} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
