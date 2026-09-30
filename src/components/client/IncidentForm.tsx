"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { Upload, X, CheckCircle, Loader2 } from "lucide-react";

const MAX_PHOTOS = 5;

const schema = z.object({
  category_id: z.string().min(1, "Choisissez un type de problème"),
  title: z.string().min(3, "Titre trop court").max(100),
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

const ACCESS_OPTIONS = [
  { value: "anytime", label: "À tout moment" },
  { value: "morning", label: "Matin (8h-12h)" },
  { value: "afternoon", label: "Après-midi (12h-18h)" },
  { value: "evening", label: "Soir (18h-22h)" },
  { value: "notify_first", label: "Me prévenir avant d'entrer" },
];

export default function IncidentForm({ hotelId, roomId, categories }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { access_preference: "notify_first" },
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center mt-6">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Demande enregistrée !</h2>
        <p className="text-gray-500 text-sm mb-6">
          Notre équipe a été notifiée et va traiter votre demande rapidement.
        </p>
        <a
          href={`/track/${trackingToken}`}
          className="inline-block bg-brand-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-600 transition-colors"
        >
          Suivre mon incident
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
      {serverError && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl p-4">{serverError}</div>
      )}

      {/* Category grid */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Type de problème *
        </label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setValue("category_id", cat.id);
                setValue("priority", cat.default_priority as FormData["priority"]);
                setValue("title", cat.name_fr);
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-colors ${
                selectedCategory === cat.id
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium leading-tight">{cat.name_fr}</span>
            </button>
          ))}
        </div>
        {errors.category_id && (
          <p className="text-xs text-red-600 mt-1">{errors.category_id.message}</p>
        )}
      </div>

      {selectedCat && (
        <>
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Titre *</label>
            <input
              {...register("title")}
              placeholder="Décrivez brièvement le problème"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Description <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Donnez plus de détails si nécessaire…"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Photos <span className="text-gray-400 font-normal">({files.length}/{MAX_PHOTOS})</span>
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-brand-400 bg-brand-50" : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {isDragActive ? "Déposez ici" : "Appuyez ou déposez des photos"}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG · max 10 Mo · {MAX_PHOTOS} photos max</p>
            </div>
            {files.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guest info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Vos coordonnées</p>
            <div>
              <input
                {...register("guest_name")}
                placeholder="Votre nom *"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.guest_name && <p className="text-xs text-red-600 mt-1">{errors.guest_name.message}</p>}
            </div>
            <div>
              <input
                {...register("guest_email")}
                type="email"
                placeholder="Votre email * (pour le suivi)"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.guest_email && <p className="text-xs text-red-600 mt-1">{errors.guest_email.message}</p>}
            </div>
            <input
              {...register("guest_phone")}
              type="tel"
              placeholder="Téléphone (optionnel)"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Access preference */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Accès à la chambre
            </label>
            <div className="space-y-2">
              {ACCESS_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    value={opt.value}
                    {...register("access_preference")}
                    className="text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-500 text-white rounded-xl py-3.5 font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Envoi en cours…
              </>
            ) : (
              "Envoyer ma demande"
            )}
          </button>
        </>
      )}
    </form>
  );
}
