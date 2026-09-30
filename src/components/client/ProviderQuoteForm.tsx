"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Props {
  quoteId: string;
  responseToken: string;
}

export default function ProviderQuoteForm({ quoteId, responseToken }: Props) {
  const [amount, setAmount] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [action, setAction] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(status: "accepted" | "declined") {
    if (status === "accepted" && !amount) {
      setError("Veuillez saisir un montant pour accepter.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/quotes/${responseToken}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quote_id: quoteId,
        status,
        amount: status === "accepted" ? Number(amount) : undefined,
        scheduled_date: scheduledDate || undefined,
        scheduled_time: scheduledTime || undefined,
        notes: notes || undefined,
      }),
    });
    if (res.ok) {
      setAction(status);
      setDone(true);
    } else {
      const d = await res.json();
      setError(d.error ?? "Erreur");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        {action === "accepted" ? (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="font-bold text-gray-900">Devis accepté !</h2>
            <p className="text-sm text-gray-500 mt-1">L'hôtel a été notifié de votre réponse.</p>
          </>
        ) : (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="font-bold text-gray-900">Demande refusée</h2>
            <p className="text-sm text-gray-500 mt-1">L'hôtel a été notifié.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
      <h2 className="font-semibold text-gray-900">Votre réponse</h2>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex : 150"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date d'intervention</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Remarques</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Précisions sur l'intervention, conditions, matériel nécessaire…"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => respond("accepted")}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-3 font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Accepter
        </button>
        <button
          onClick={() => respond("declined")}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-200 disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          Refuser
        </button>
      </div>
    </div>
  );
}
