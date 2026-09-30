import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@fixhub.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fixhub.app";

export async function sendIncidentConfirmation({
  to,
  guestName,
  hotelName,
  roomNumber,
  category,
  trackingToken,
}: {
  to: string;
  guestName: string;
  hotelName: string;
  roomNumber: string;
  category: string;
  trackingToken: string;
}) {
  const trackingUrl = `${APP_URL}/track/${trackingToken}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[${hotelName}] Votre demande de maintenance a été enregistrée`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a2744;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">FixHub – Maintenance Hôtelière</h1>
        </div>
        <div style="background:#f8f9fa;padding:32px;border-radius:0 0 8px 8px">
          <p>Bonjour ${guestName},</p>
          <p>Votre demande de maintenance a bien été enregistrée :</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;font-weight:bold">Hôtel</td><td>${hotelName}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Chambre</td><td>${roomNumber}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Type</td><td>${category}</td></tr>
          </table>
          <p>Suivez l'avancement en temps réel :</p>
          <a href="${trackingUrl}"
             style="display:inline-block;background:#1a2744;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            Suivre ma demande
          </a>
          <p style="margin-top:24px;font-size:12px;color:#666">
            Lien de suivi : <a href="${trackingUrl}">${trackingUrl}</a>
          </p>
        </div>
      </div>`,
  });
}

export async function sendStatusUpdate({
  to,
  guestName,
  hotelName,
  statusLabel,
  notes,
  trackingToken,
}: {
  to: string;
  guestName: string;
  hotelName: string;
  statusLabel: string;
  notes?: string;
  trackingToken: string;
}) {
  const trackingUrl = `${APP_URL}/track/${trackingToken}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[${hotelName}] Mise à jour de votre demande : ${statusLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a2744;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">FixHub – Mise à jour</h1>
        </div>
        <div style="background:#f8f9fa;padding:32px;border-radius:0 0 8px 8px">
          <p>Bonjour ${guestName},</p>
          <p>Le statut de votre demande a changé : <strong>${statusLabel}</strong></p>
          ${notes ? `<blockquote style="border-left:4px solid #1a2744;padding:8px 16px;background:#fff;margin:16px 0">${notes}</blockquote>` : ""}
          <a href="${trackingUrl}"
             style="display:inline-block;background:#1a2744;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            Voir le suivi
          </a>
        </div>
      </div>`,
  });
}

export async function sendEvaluationRequest({
  to,
  guestName,
  hotelName,
  evaluationToken,
}: {
  to: string;
  guestName: string;
  hotelName: string;
  evaluationToken: string;
}) {
  const evalUrl = `${APP_URL}/evaluate/${evaluationToken}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[${hotelName}] Votre avis sur notre intervention`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a2744;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Comment s'est passée notre intervention ?</h1>
        </div>
        <div style="background:#f8f9fa;padding:32px;border-radius:0 0 8px 8px">
          <p>Bonjour ${guestName},</p>
          <p>Votre demande de maintenance a été résolue par l'équipe de <strong>${hotelName}</strong>.</p>
          <p>30 secondes pour nous donner votre avis ?</p>
          <a href="${evalUrl}"
             style="display:inline-block;background:#e8b800;color:#1a2744;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            ⭐ Évaluer l'intervention
          </a>
          <p style="margin-top:24px;font-size:12px;color:#666">
            Lien d'évaluation : <a href="${evalUrl}">${evalUrl}</a>
          </p>
        </div>
      </div>`,
  });
}

export async function sendTeamInvitation({
  to,
  inviterName,
  hotelName,
  role,
}: {
  to: string;
  inviterName: string;
  hotelName: string;
  role: string;
}) {
  const loginUrl = `${APP_URL}/auth/login`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Invitation à rejoindre ${hotelName} sur FixHub`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a2744;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">FixHub – Invitation</h1>
        </div>
        <div style="background:#f8f9fa;padding:32px;border-radius:0 0 8px 8px">
          <p>${inviterName} vous invite à rejoindre <strong>${hotelName}</strong> sur FixHub.</p>
          <p>Votre rôle : <strong>${role}</strong></p>
          <a href="${loginUrl}"
             style="display:inline-block;background:#1a2744;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            Accéder à FixHub
          </a>
        </div>
      </div>`,
  });
}
