"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Hotel {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  emergency_phone?: string;
}

export default function HotelSettingsForm({ hotel }: { hotel: Hotel }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: hotel.name ?? "",
    address: hotel.address ?? "",
    city: hotel.city ?? "",
    country: hotel.country ?? "",
    phone: hotel.phone ?? "",
    email: hotel.email ?? "",
    emergency_phone: hotel.emergency_phone ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await fetch(`/api/hotels/${hotel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setSuccess(true);
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error ?? "Erreur lors de la sauvegarde");
    }
    setLoading(false);
  }

  const field = (label: string, key: keyof typeof form, type = "text", required = true) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && " *"}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {success && <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 mb-4">Modifications enregistrées !</div>}
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}
      <form onSubmit={handleSave} className="space-y-4">
        {field("Nom de l'hôtel", "name")}
        {field("Adresse", "address")}
        <div className="grid grid-cols-2 gap-4">
          {field("Ville", "city")}
          {field("Pays", "country")}
        </div>
        {field("Téléphone principal", "phone", "tel")}
        {field("Email", "email", "email")}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Téléphone d'urgence
            <span className="text-xs text-gray-400 font-normal ml-2">(affiché si l'app est indisponible)</span>
          </label>
          <input
            type="tel"
            value={form.emergency_phone}
            onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
            placeholder="+33 1 23 45 67 89"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 text-white rounded-lg py-2.5 font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
