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
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen shrink-0">
      {/* Logo / Hôtel */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {hotel.logo_url ? (
            <img src={hotel.logo_url} alt={hotel.name} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-brand-500 to-brand-700">
              <Building2 className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{hotel.name}</p>
            <p className="text-xs text-gray-500 capitalize">{role.replace("_", " ")}</p>
          </div>
        </div>
        {isTrialing && (
          <div className="mt-3 bg-gold-500 text-brand-900 text-xs font-bold rounded-full px-3 py-1 text-center">
            Période d'essai
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-white text-gray-900 border border-gray-200 shadow-card"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 border border-transparent"
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  active ? "bg-brand-50 text-brand-600" : "bg-gray-100 text-gray-500"
                }`}>
                  <Icon className="w-4 h-4" />
                </span>
                {item.label}
              </Link>
            );
          })}

        {isSuperAdmin && (
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 mt-3 border-t border-gray-200 pt-4"
          >
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 text-gray-500">
              <Shield className="w-4 h-4" />
            </span>
            Super Admin
          </Link>
        )}
      </nav>

      {/* Déconnexion */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 w-full text-left"
        >
          <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 text-gray-500">
            <LogOut className="w-4 h-4" />
          </span>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
