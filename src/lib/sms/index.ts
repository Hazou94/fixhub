import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID || "AC_placeholder",
  process.env.TWILIO_AUTH_TOKEN || "placeholder_token"
);
const FROM = process.env.TWILIO_PHONE_NUMBER!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fixhub.app";

export async function sendProviderQuoteRequest({
  to,
  providerName,
  hotelName,
  roomNumber,
  category,
  responseToken,
}: {
  to: string;
  providerName: string;
  hotelName: string;
  roomNumber: string;
  category: string;
  responseToken: string;
}) {
  const quoteUrl = `${APP_URL}/provider/quote/${responseToken}`;
  await client.messages.create({
    from: FROM,
    to,
    body: `[FixHub] Bonjour ${providerName}, nouvelle demande de devis chez ${hotelName} - Chambre ${roomNumber} (${category}). Répondre ici : ${quoteUrl}`,
  });
}

export async function sendTechnicianAssignment({
  to,
  technicianName,
  hotelName,
  roomNumber,
  category,
  priority,
}: {
  to: string;
  technicianName: string;
  hotelName: string;
  roomNumber: string;
  category: string;
  priority: string;
}) {
  await client.messages.create({
    from: FROM,
    to,
    body: `[FixHub] Bonjour ${technicianName}, nouvel incident assigné à ${hotelName} - Chambre ${roomNumber} - ${category} - Priorité : ${priority}. Connectez-vous à FixHub pour les détails.`,
  });
}

export async function sendGuestSmsUpdate({
  to,
  guestName,
  statusLabel,
  trackingToken,
}: {
  to: string;
  guestName: string;
  statusLabel: string;
  trackingToken: string;
}) {
  const trackingUrl = `${APP_URL}/track/${trackingToken}`;
  await client.messages.create({
    from: FROM,
    to,
    body: `[FixHub] Bonjour ${guestName}, votre demande a été mise à jour : ${statusLabel}. Suivi : ${trackingUrl}`,
  });
}
