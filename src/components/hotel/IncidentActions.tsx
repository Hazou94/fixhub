"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IncidentStatus } from "@/types";
import { STATUS_LABELS } from "@/types";

interface Technician {
  user_id: string;
  profiles: { full_name: string } | null;
}

interface Props {
  incident: {
    id: string;
    status: string;
    assigned_to?: string;
    hotel_id: string;
  };
  technicians: Technician[];
  role: string;
  currentUserId: string;
}

const TRANSITIONS: Record<string, IncidentStatus[]> = {
  new: ["acknowledged", "cancelled"],
  acknowledged: ["assigned", "in_progress", "cancelled"],
  assigned: ["in_progress", "waiting_parts", "cancelled"],
  in_progress: ["waiting_parts", "waiting_provider", "resolved"],
  waiting_parts: ["in_progress", "resolved"],
  waiting_provider: ["in_progress", "resolved"],
  resolved: ["closed"],
  closed: [],
  cancelled: [],
};

export default function IncidentActions({ incident, technicians, role }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState(incident.assigned_to ?? "");
  const [error, setError] = useState<string | null>(null);

  const nextStatuses = TRANSITIONS[incident.status] ?? [];
  const canAct = ["hotel_admin", "manager", "technician"].includes(role);

  async function changeStatus(newStatus: IncidentStatus) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/incidents/${incident.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        note: note || undefined,
        assigned_to: assignedTo || undefined,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erreur");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  if (!canAct || nextStatuses.length === 0) return null;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>

      {error && <p className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded">{error}</p>}

      {/* Assign technician */}
      {(role === "hotel_admin" || role === "manager") && technicians.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Assigner à</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— Choisir un technicien —</option>
            {technicians.map((t) => (
              <option key={t.user_id} value={t.user_id}>
                {t.profiles?.full_name ?? t.user_id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Note */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">Note (optionnel)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Ajouter un commentaire…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {/* Status buttons */}
      <div className="space-y-2">
        {nextStatuses.map((s) => (
          <button
            key={s}
            onClick={() => changeStatus(s)}
            disabled={loading}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              s === "resolved" || s === "closed"
                ? "bg-green-600 text-white hover:bg-green-700"
                : s === "cancelled"
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-brand-500 text-white hover:bg-brand-600"
            }`}
          >
            {loading ? "…" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
