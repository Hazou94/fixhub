import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProviderQuoteForm from "@/components/client/ProviderQuoteForm";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function ProviderQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: quote } = await supabase
    .from("provider_quotes")
    .select("*, service_providers(company_name, contact_name), incidents(title, description, priority, rooms(room_number), incident_categories(name_fr, icon), incident_photos(public_url), hotels(name))")
    .eq("response_token", token)
    .single();

  if (!quote) notFound();

  const isExpired = new Date(quote.expires_at) < new Date();
  const isAnswered = quote.status !== "pending";

  const incident = quote.incidents as {
    title: string;
    description?: string;
    priority: string;
    rooms: { room_number: string };
    incident_categories: { name_fr: string; icon: string };
    incident_photos: { public_url: string }[];
    hotels: { name: string };
  };
  const provider = quote.service_providers as { company_name: string; contact_name: string };

  if (isExpired || isAnswered) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">{isExpired ? "⏰" : "✅"}</div>
          <h1 className="text-xl font-bold text-gray-900">
            {isExpired ? "Lien expiré" : "Déjà répondu"}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {isExpired
              ? "Ce lien de devis a expiré. Contactez l'hôtel si nécessaire."
              : `Vous avez déjà répondu à cette demande (${quote.status === "accepted" ? "accepté" : "refusé"}).`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <p className="text-brand-200 text-xs">Demande de devis — FixHub</p>
          <h1 className="font-bold text-lg">{incident.hotels.name}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Bonjour {provider.contact_name},</p>
          <p className="text-sm text-gray-700 mt-1">Voici les détails de l'incident pour lequel votre devis est demandé.</p>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{incident.incident_categories.icon}</span>
              <div>
                <p className="font-semibold text-gray-900">{incident.title}</p>
                <p className="text-xs text-gray-500">{incident.incident_categories.name_fr} · Chambre {incident.rooms.room_number}</p>
              </div>
            </div>
            {incident.description && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{incident.description}</p>
            )}
          </div>

          {incident.incident_photos?.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {incident.incident_photos.map((p, i) => (
                <img key={i} src={p.public_url} alt="" className="w-full h-24 object-cover rounded-xl" />
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3">
            Ce lien expire le {format(new Date(quote.expires_at), "d MMMM yyyy à HH:mm", { locale: fr })}.
          </p>
        </div>

        <ProviderQuoteForm quoteId={quote.id} responseToken={token} />
      </div>
    </div>
  );
}
