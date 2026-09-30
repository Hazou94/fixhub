"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, AlertTriangle, QrCode, Users,
  Settings, LogOut, Building2, RefreshCw, Wrench, Shield,
} from "lucide-react";

interface Hotel {
  id: string;
  name: string;
  logo_url?: string;
  subscription_status: string;
  trial_ends_at?: string;
}

interface Props {
  hotel: Hotel;
  role: string;
  userId: string;
  isSuperAdmin: boolean;
}

const navItems = [
  { href: "/hotel/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["hotel_admin", "manager", "technician", "receptionist"] },
  { href: "/hotel/incidents", label: "Incidents", icon: AlertTriangle, roles: ["hotel_admin", "manager", "technician", "receptionist"] },
  { href: "/hotel/qrcodes", label: "QR Codes", icon: QrCode, roles: ["hotel_admin", "manager"] },
  { href: "/hotel/providers", label: "Prestataires", icon: Wrench, roles: ["hotel_admin", "manager"] },
  { href: "/hotel/recurring", label: "Récurrents", icon: RefreshCw, roles: ["hotel_admin", "manager"] },
  { href: "/hotel/team", label: "Équipe", icon: Users, roles: ["hotel_admin"] },
  { href: "/hotel/settings", label: "Paramètres", icon: Settings, roles: ["hotel_admin"] },
];

export default function HotelNav({ hotel, role, isSuperAdmin }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  const isTrialing = hotel.subscription_status === "trialing";

  return (
    <aside className="w-64 bg-brand-500 text-white flex flex-col h-screen">
      {/* Logo / Hotel name */}
      <div className="p-6 border-b border-brand-400">
        <div className="flex items-center gap-3">
          {hotel.logo_url ? (
            <img src={hotel.logo_url} alt={hotel.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 bg-brand-400 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold truncate">{hotel.name}</p>
            <p className="text-xs text-brand-200 capitalize">{role.replace("_", " ")}</p>
          </div>
        </div>
        {isTrialing && (
          <div className="mt-3 bg-gold-500 text-brand-900 text-xs font-bold rounded-full px-3 py-1 text-center">
            Période d'essai
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-white/20 font-medium" : "hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}

        {isSuperAdmin && (
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-white/10 mt-4 border-t border-brand-400 pt-4"
          >
            <Shield className="w-4 h-4 shrink-0" />
            Super Admin
          </Link>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-brand-400">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-white/10 w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
