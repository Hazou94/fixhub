"use client";

import { useState } from "react";
import { Download, Loader2, QrCode } from "lucide-react";

interface Room {
  id: string;
  room_number: string;
  floor?: number;
  room_type?: string;
}

interface QrResult {
  room_number: string;
  image_data_url: string;
  qr_url: string;
}

interface Props {
  rooms: Room[];
  hotelSlug: string;
  hotelId: string;
}

export default function QrCodesClient({ rooms, hotelId }: Props) {
  const [qrData, setQrData] = useState<QrResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generateAll() {
    setLoading(true);
    const res = await fetch("/api/qrcodes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotel_id: hotelId }),
    });
    const data = await res.json();
    setQrData(data.qrcodes ?? []);
    setGenerated(true);
    setLoading(false);
  }

  function downloadAll() {
    qrData.forEach((qr) => {
      const a = document.createElement("a");
      a.href = qr.image_data_url;
      a.download = `qr-chambre-${qr.room_number}.png`;
      a.click();
    });
  }

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <button
          onClick={generateAll}
          disabled={loading || rooms.length === 0}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
          Générer tous les QR codes ({rooms.length} chambres)
        </button>
        {generated && qrData.length > 0 && (
          <button
            onClick={downloadAll}
            className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Tout télécharger
          </button>
        )}
      </div>

      {rooms.length === 0 && (
        <div className="bg-yellow-50 text-yellow-800 rounded-xl p-6 text-sm">
          Aucune chambre configurée. Ajoutez des chambres via le script SQL ou les paramètres.
        </div>
      )}

      {generated && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {qrData.map((qr) => (
            <div key={qr.room_number} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <img src={qr.image_data_url} alt={`QR Chambre ${qr.room_number}`} className="w-full" />
              <p className="text-sm font-bold text-gray-900 mt-2">Chambre {qr.room_number}</p>
              <a
                href={qr.image_data_url}
                download={`qr-chambre-${qr.room_number}.png`}
                className="text-xs text-brand-500 hover:underline mt-1 inline-block"
              >
                Télécharger
              </a>
            </div>
          ))}
        </div>
      )}

      {!generated && rooms.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 border-2 border-dashed border-gray-200">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Cliquez sur "Générer" pour créer les QR codes</p>
        </div>
      )}
    </div>
  );
}
