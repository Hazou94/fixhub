"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { Upload, X, CheckCircle, Loader2, Camera, Sparkles } from "lucide-react";

const MAX_PHOTOS = 5;

const schema = z.object({
  category_id: z.string().min(1, "Choisissez un type de problème"),
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  guest_name: z.string().min(2, "Votre nom est requis"),
  guest_email: z.string().email("Email invalide"),
  guest_phone: z.string().optional(),
  access_preference: z.enum(["anytime", "morning", "afternoon", "evening", "notify_first"]),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

type FormData = z.infer<typeof schema>;

interface Category {
  id: string;
  name_fr: string;
  icon: string;
  default_priority: string;
}

interface Location {
  id: string;
  name_fr: string;
}

interface Props {
  hotelId: string;
  roomId: string;
  roomNumber: string;
  categories: Category[];
  locations: Location[];
}

const URGENCY = [
  { value: "low", label: "Faible", on: "bg-emerald-500 border-emerald-500 text-white" },
  { value: "medium", label: "Moyenne", on: "bg-amber-500 border-amber-500 text-white" },
  { value: "high", label: "Haute", on: "bg-orange-500 border-orange-500 text-white" },
  { value: "critical", label: "Critique", on: "bg-rose-500 border-rose-500 text-white" },
] as const;

const SLOTS = [
  { value: "notify_first", label: "Me prévenir avant" },
  { value: "morning", label: "Matin (8h-12h)" },
  { value: "afternoon", label: "Après-midi (12h-18h)" },
  { value: "evening", label: "Soir (18h-22h)" },
];

// Pré-qualification IA simulée selon la catégorie
function aiHint(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("plomb")) return "Fuite probable détectée. Catégorie plomberie, urgence haute suggérée.";
  if (n.includes("élec") || n.includes("elec") || n.includes("lumi")) return "Problème électrique probable. Couper l'alimentation de la zone recommandée.";
  if (n.includes("clim") || n.includes("chauff")) return "Unité de climatisation/chauffage. Vérifier filtre et télécommande.";
  if (n.includes("serrure") || n.includes("porte")) return "Problème de serrure/porte — impact sécurité, priorité haute.";
  if (n.includes("mobil")) return "Mobilier endommagé. Intervention de menuiserie légère.";
  if (n.includes("wifi") || n.includes("internet") || n.includes("tv") || n.includes("multi")) return "Équipement réseau/multimédia. Redémarrage à tester.";
  if (n.includes("ménage") || n.includes("menage") || n.includes("propre")) return "Demande de propreté. Affectation à l'équipe d'étage.";
  return "Demande à qualifier par l'équipe technique.";
}

export default function IncidentForm({ hotelId, roomId, categories }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<string>("medium");
  const [presence, setPresence] = useState<"absent" | "present">("absent");

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { access_preference: "anytime", priority: "medium" },
  });

  const selectedCategory = watch("category_id");
  const selectedCat = categories.find((c) => c.id === selectedCategory);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted].slice(0, MAX_PHOTOS));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: MAX_PHOTOS,
    maxSize: 10 * 1024 * 1024,
  });

  function pickCategory(cat: Category) {
    setValue("category_id", cat.id);
    setValue("title", cat.name_fr);
    const p = (cat.default_priority || "medium") as FormData["priority"];
    setValue("priority", p);
    setUrgency(p as string);
  }

  function pickUrgency(v: string) {
    setUrgency(v);
    setValue("priority", v as FormData["priority"]);
  }

  function pickPresence(mode: "absent" | "present") {
    setPresence(mode);
    setValue("access_preference", mode === "absent" ? "anytime" : "notify_first");
  }

  async function onSubmit(data: FormData) {
    setServerError(null);
    const fd = new FormData();
    fd.append("hotel_id", hotelId);
    fd.append("room_id", roomId);
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined) fd.append(k, String(v)); });
    files.forEach((f) => fd.append("photos", f));

    const res = await fetch("/api/incidents", { method: "POST", body: fd });
    const json = await res.json();
    if (res.ok) {
      setTrackingToken(json.tracking_token);
      setSubmitted(true);
    } else {
      setServerError(json.error ?? "Erreur lors de l'envoi. Veuillez réessayer.");
    }
  }

  if (submitted && trackingToken) {
    return (
      <div className="fh-card p-8 text-center mt-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-9 h-9 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée !</h2>
        <p className="text-gray-500 text-sm mb-6">
          L'équipe technique a été notifiée et va traiter votre demande rapidement.
          Un e-mail de suivi vous a été adressé.
        </p>
        <a href={`/track/${trackingToken}`} className="fh-btn w-full">
          Suivre mon incident →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
      {serverError && (
        <div className="bg-rose-50 text-rose-700 text-sm rounded-xl p-4 border border-rose-200">{serverError}</div>
      )}

      {/* Catégorie */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Type de problème <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => pickCategory(cat)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                selectedCategory === cat.id
                  ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-[11px] font-semibold leading-tight">{cat.name_fr}</span>
            </button>
          ))}
        </div>
        {errors.category_id && <p className="text-xs text-rose-600 mt-1.5">{errors.category_id.message}</p>}
      </div>

      {selectedCat && (
        <>
          {/* Photos */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Photo du problème <span className="text-gray-400 font-normal">({files.length}/{MAX_PHOTOS})</span>
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-brand-400 bg-brand-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"
              }`}
            >
              <input {...getInputProps()} />
              <Camera className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
              <p className="text-sm font-medium text-gray-600">
                {isDragActive ? "Déposez ici" : "Prendre ou importer une photo"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">L'IA pré-qualifie le problème</p>
            </div>

            {files.length > 0 && (
              <>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {files.map((f, i) => (
                    <div key={i} className="relative">
                      <img src={URL.createObjectURL(f)} alt="" className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 mt-2.5 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2.5">
                  <Sparkles className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-700"><span className="font-bold text-brand-700">Analyse IA</span> — {aiHint(selectedCat.name_fr)}</p>
                </div>
              </>
            )}
          </div>

          {/* Urgence */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Niveau d'urgence</label>
            <div className="grid grid-cols-4 gap-2">
              {URGENCY.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => pickUrgency(u.value)}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    urgency === u.value ? u.on : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Commentaire</label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Ex : le robinet du lavabo goutte en continu…"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Coordonnées */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
            <p className="text-sm font-semibold text-gray-800">Vos coordonnées</p>
            <div>
              <input
                {...register("guest_name")}
                placeholder="Votre nom *"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.guest_name && <p className="text-xs text-rose-600 mt-1">{errors.guest_name.message}</p>}
            </div>
            <div>
              <input
                {...register("guest_email")}
                type="email"
                placeholder="Votre e-mail * (pour le suivi)"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.guest_email && <p className="text-xs text-rose-600 mt-1">{errors.guest_email.message}</p>}
            </div>
            <input
              {...register("guest_phone")}
              type="tel"
              placeholder="Téléphone (optionnel)"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Présence */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Intervention en votre présence ?</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => pickPresence("absent")}
                className={`w-full flex items-start gap-3 text-left p-3 rounded-xl border transition-all ${
                  presence === "absent" ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="text-lg">✅</span>
                <span>
                  <span className="block text-sm font-semibold text-gray-800">Sans ma présence</span>
                  <span className="block text-xs text-gray-500">Le technicien peut entrer même si je suis absent</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => pickPresence("present")}
                className={`w-full flex items-start gap-3 text-left p-3 rounded-xl border transition-all ${
                  presence === "present" ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="text-lg">🙋</span>
                <span>
                  <span className="block text-sm font-semibold text-gray-800">Je souhaite être présent</span>
                  <span className="block text-xs text-gray-500">Choisissez un créneau préféré</span>
                </span>
              </button>
            </div>

            {presence === "present" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {SLOTS.map((s) => (
                  <label
                    key={s.value}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-white cursor-pointer text-sm"
                  >
                    <input type="radio" value={s.value} {...register("access_preference")} className="text-brand-500 focus:ring-brand-500" />
                    <span className="text-gray-700">{s.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Envoi */}
          <button type="submit" disabled={isSubmitting} className="fh-btn w-full py-3.5 text-base">
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours…</>
            ) : (
              "Envoyer le signalement →"
            )}
          </button>
          <p className="text-center text-xs text-gray-400">Temps estimé : 30 secondes · aucun compte requis</p>
        </>
      )}
    </form>
  );
}
