"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, ShieldCheck, X } from "lucide-react";

import { useI18n } from "@/app/providers";
import { createPetSchema } from "@/lib/validators/pets";
import { apiFetch } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type PetType = "DOG" | "CAT" | "OTHER";
type PetGender = "MALE" | "FEMALE" | "UNKNOWN";
type UploadedImage = { url: string; publicId: string; width?: number; height?: number };

type PetFormValues = {
  name: string;
  birthYear: number;
  birthMonth: number;
  type: PetType;
  gender?: PetGender;
  breed?: string;
  isNeutered?: boolean;
  description: string;
};

type CloudinarySignature = {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
};

type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  error?: { message?: string };
};

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

function getInitialBirthDate(value?: string | Date | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

async function getUploadSignature(): Promise<CloudinarySignature> {
  return apiFetch<CloudinarySignature>("/api/cloudinary/signature", { method: "POST" });
}

async function uploadToCloudinary(file: File, sig: CloudinarySignature): Promise<UploadedImage> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const json = (await res.json().catch(() => null)) as CloudinaryUploadResponse | null;
  if (!res.ok) throw new Error(json?.error?.message ?? "Cloudinary upload failed");
  if (!json?.secure_url || !json.public_id) throw new Error("Invalid Cloudinary response");

  return {
    url: json.secure_url,
    publicId: json.public_id,
    width: json.width,
    height: json.height,
  };
}

export function PetForm({
  mode,
  petId,
  initial,
}: {
  mode: "create" | "edit";
  petId?: string;
  initial?: Partial<PetFormValues> & { birthDate?: string | Date | null; images?: UploadedImage[] };
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { locale, messages } = useI18n();
  const initialBirthDate = getInitialBirthDate(initial?.birthDate);
  const currentYear = new Date().getUTCFullYear();
  const yearOptions = Array.from({ length: 41 }, (_, index) => currentYear - index);
  const selectClassName =
    "h-11 rounded-2xl border border-input/70 bg-background/72 px-4 text-sm shadow-[inset_0_1px_0_hsl(var(--background)/0.65)] backdrop-blur-xl";

  const [images, setImages] = React.useState<UploadedImage[]>(initial?.images ?? []);
  const [uploading, setUploading] = React.useState(false);
  const [imageError, setImageError] = React.useState<string | null>(
    (initial?.images?.length ?? 0) > 0 ? null : messages.form.addOneImage
  );

  const form = useForm<PetFormValues>({
    resolver: zodResolver(createPetSchema.omit({ images: true })),
    mode: "onChange",
    defaultValues: {
      name: initial?.name ?? "",
      birthYear: initial?.birthYear ?? initialBirthDate.getUTCFullYear(),
      birthMonth: initial?.birthMonth ?? initialBirthDate.getUTCMonth() + 1,
      type: (initial?.type as PetType) ?? "DOG",
      gender: initial?.gender ?? "UNKNOWN",
      breed: initial?.breed ?? "",
      isNeutered: initial?.isNeutered ?? false,
      description: initial?.description ?? "",
    },
  });

  React.useEffect(() => {
    if (images.length === 0) {
      setImageError(messages.form.addOneImage);
      return;
    }
    if (images.length > 8) {
      setImageError(messages.form.maxImages);
      return;
    }
    setImageError(null);
  }, [images, messages.form.addOneImage, messages.form.maxImages]);

  const submit = useMutation({
    mutationFn: async (values: PetFormValues) => {
      const payload = createPetSchema.parse({
        ...values,
        breed: values.breed?.trim() || undefined,
        images,
      });
      if (mode === "create") {
        return apiFetch<{ id: string }>("/api/pets", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch<{ id: string }>(`/api/pets/${petId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (pet) => {
      toast.success(mode === "create" ? messages.form.petCreated : messages.form.petUpdated);
      await qc.invalidateQueries({ queryKey: ["pets"] });
      router.push(`/pet/${pet.id}`);
    },
    onError: (err: unknown) => toast.error(errorMessage(err, messages.form.failedToSave)),
  });

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (images.length + files.length > 8) {
      setImageError(messages.form.maxImages);
      toast.error(messages.form.maxImages);
      return;
    }

    setUploading(true);
    try {
      const sig = await getUploadSignature();
      const uploaded: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        uploaded.push(await uploadToCloudinary(file, sig));
      }
      setImages((prev) => [...prev, ...uploaded]);
      toast.success(messages.form.imagesUploaded);
    } catch (err: unknown) {
      toast.error(errorMessage(err, messages.form.uploadFailed));
    } finally {
      setUploading(false);
    }
  }

  const validationItems = [
    form.formState.errors.name?.message ?? (!form.watch("name").trim() ? messages.form.nameRequired : null),
    form.formState.errors.birthMonth?.message ??
      form.formState.errors.birthYear?.message ??
      (!form.watch("birthYear") || !form.watch("birthMonth") ? messages.form.birthMonthRequired : null),
    form.formState.errors.description?.message ??
      (!form.watch("description").trim() ? messages.form.descriptionRequired : null),
    imageError ?? (images.length === 0 ? messages.form.imageLimitHint : null),
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

  const shouldShowValidation = validationItems.length > 0;
  const imageCountLabel =
    locale === "zh" ? `${images.length}${messages.form.imageCount}` : `${images.length} ${messages.form.imageCount}`;

  return (
    <Card className="rounded-[34px] p-5 sm:p-7">
      <div className="mb-4 text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
        OurPets
      </div>
      <h1 className="text-3xl font-semibold tracking-[-0.04em]">
        {mode === "create" ? messages.form.createTitle : messages.form.editTitle}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        {messages.form.description}
      </p>

      <form
        className="mt-6 grid gap-6"
        onSubmit={form.handleSubmit((values) => {
          if (images.length === 0 || imageError) {
            toast.error(imageError ?? messages.form.imageLimitHint);
            return;
          }
          submit.mutate(values);
        })}
      >
        {shouldShowValidation ? (
          <div className="glass-panel rounded-[26px] border border-amber-400/30 bg-amber-500/8 p-4 sm:p-5">
            <div className="text-sm font-medium text-foreground">{messages.form.liveValidationTitle}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {validationItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-amber-400/30 bg-background/70 px-3 py-1 text-xs text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="glass-panel rounded-[26px] p-4 sm:p-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium">{messages.form.name}</label>
            <Input {...form.register("name")} placeholder={messages.form.namePlaceholder} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel rounded-[26px] p-4 sm:p-5">
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4 text-primary" />
                {messages.form.birthMonth}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className={selectClassName}
                  {...form.register("birthYear", { valueAsNumber: true })}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  className={selectClassName}
                  {...form.register("birthMonth", { valueAsNumber: true })}
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>
                      {month.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
              {form.formState.errors.birthYear || form.formState.errors.birthMonth ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.birthYear?.message ?? form.formState.errors.birthMonth?.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="glass-panel rounded-[26px] p-4 sm:p-5">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{messages.form.type}</label>
              <select className={selectClassName} {...form.register("type")}>
                <option value="DOG">{messages.form.dog}</option>
                <option value="CAT">{messages.form.cat}</option>
                <option value="OTHER">{messages.form.other}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="glass-panel rounded-[26px] p-4 sm:p-5">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{messages.form.gender}</label>
              <select className={selectClassName} {...form.register("gender")}>
                <option value="UNKNOWN">{messages.form.unknownGender}</option>
                <option value="MALE">{messages.form.male}</option>
                <option value="FEMALE">{messages.form.female}</option>
              </select>
            </div>
          </div>

          <div className="glass-panel rounded-[26px] p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="grid gap-2">
                <label className="text-sm font-medium">{messages.form.breed}</label>
                <Input {...form.register("breed")} placeholder={messages.form.breedPlaceholder} />
              </div>
              <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <input type="checkbox" className="h-4 w-4 accent-primary" {...form.register("isNeutered")} />
                <span>{messages.form.neuteredYes}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[26px] p-4 sm:p-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium">{messages.form.descriptionLabel}</label>
            <Textarea
              rows={6}
              {...form.register("description")}
              placeholder={messages.form.descriptionPlaceholder}
            />
            {form.formState.errors.description ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="glass-panel rounded-[26px] p-4 sm:p-5">
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{messages.form.images}</label>
              <div className="text-xs text-muted-foreground">{imageCountLabel}</div>
            </div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onPickFiles(e.target.files)}
              disabled={uploading}
            />
            {imageError ? <p className="text-xs text-destructive">{imageError}</p> : null}
            {images.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border/70 bg-background/60 p-6 text-center text-sm text-muted-foreground">
                {messages.form.addOneImage}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {images.map((img) => (
                  <div key={img.publicId} className="group relative aspect-square overflow-hidden rounded-[22px]">
                    <Image
                      src={img.url}
                      alt={messages.form.images}
                      fill
                      loading="lazy"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1200px) 25vw, 200px"
                    />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((i) => i.publicId !== img.publicId))}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/75"
                      aria-label={messages.form.removeImage}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
            {messages.common.cancel}
          </Button>
          <Button
            type="submit"
            disabled={submit.isPending || uploading || Boolean(imageError) || !form.formState.isValid}
            className="w-full sm:w-auto"
          >
            {submit.isPending
              ? messages.form.saving
              : mode === "create"
                ? messages.form.create
                : messages.form.saveChanges}
          </Button>
        </div>
      </form>
    </Card>
  );
}
