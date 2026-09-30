"use client";

import { useState, useEffect } from "react";
import { Star, CheckCircle, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function EvaluatePage() {
  const { token } = useParams();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already submitted (quick fetch)
    fetch(`/api/evaluate/${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.submitted) setAlreadyDone(true); })
      .catch(() => {});
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Veuillez sélectionner une note."); return; }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/evaluate/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    if (res.status === 409) {
      setAlreadyDone(true);
    } else if (res.ok) {
      setSubmitted(true);
    } else {
      const d = await res.json();
      setError(d.error ?? "Erreur");
    }
    setLoading(false);
  }

  if (alreadyDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Déjà évalué</h1>
          <p className="text-gray-500 text-sm mt-2">Vous avez déjà soumis votre évaluation. Merci !</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🙏</div>
          <h1 className="text-xl font-bold text-gray-900">Merci pour votre avis !</h1>
          <p className="text-gray-500 text-sm mt-2">Votre retour nous aide à améliorer nos services.</p>
          <div className="text-3xl mt-4">{"⭐".repeat(rating)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Évaluez notre intervention</h1>
        <p className="text-sm text-gray-500 mb-6">Comment s'est passée la résolution de votre problème ?</p>

        {error && <p className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-xl">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(0)}
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    i <= (hovered || rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>

          {rating > 0 && (
            <p className="text-sm font-medium text-gray-700">
              {["", "Très insatisfait 😞", "Insatisfait 😕", "Correct 😐", "Satisfait 😊", "Très satisfait 😍"][rating]}
            </p>
          )}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Un commentaire ? (optionnel)"
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full bg-brand-500 text-white rounded-xl py-3 font-semibold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Envoyer mon évaluation
          </button>
        </form>
      </div>
    </div>
  );
}
