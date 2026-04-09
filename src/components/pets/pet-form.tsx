"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";

import { useI18n } from "@/app/providers";
import { createPetSchema } from "@/lib/validators/pets";
import { apiFetch } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type PetType = "DOG" | "CAT" | "OTHER";
type UploadedImage = { url: string; publicId: string; width?: number; height?: number };

type PetFormValues = {
  name: string;
  age: number;
  type: PetType;
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
  initial?: Partial<PetFormValues> & { images?: UploadedImage[] };
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { messages } = useI18n();

  const [images, setImages] = React.useState<UploadedImage[]>(initial?.images ?? []);
  const [uploading, setUploading] = React.useState(false);

  const form = useForm<PetFormValues>({
    resolver: zodResolver(createPetSchema.omit({ images: true })),
    defaultValues: {
      name: initial?.name ?? "",
      age: initial?.age ?? 0,
      type: (initial?.type as PetType) ?? "DOG",
      description: initial?.description ?? "",
    },
  });

  const submit = useMutation({
    mutationFn: async (values: PetFormValues) => {
      const payload = createPetSchema.parse({ ...values, images });
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

  return (
    <Card className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === "create" ? messages.form.createTitle : messages.form.editTitle}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {messages.form.description}
      </p>

      <form
        className="mt-6 grid gap-6"
        onSubmit={form.handleSubmit((values) => submit.mutate(values))}
      >
        <div className="grid gap-2">
          <label className="text-sm font-medium">{messages.form.name}</label>
          <Input {...form.register("name")} placeholder={messages.form.namePlaceholder} />
          {form.formState.errors.name ? (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">{messages.form.age}</label>
            <Input
              type="number"
              min={0}
              max={40}
              {...form.register("age", { valueAsNumber: true })}
            />
            {form.formState.errors.age ? (
              <p className="text-xs text-destructive">{form.formState.errors.age.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">{messages.form.type}</label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              {...form.register("type")}
            >
              <option value="DOG">{messages.form.dog}</option>
              <option value="CAT">{messages.form.cat}</option>
              <option value="OTHER">{messages.form.other}</option>
            </select>
          </div>
        </div>

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

        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{messages.form.images}</label>
            <div className="text-xs text-muted-foreground">{images.length}/8</div>
          </div>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onPickFiles(e.target.files)}
            disabled={uploading}
          />
          {images.length === 0 ? (
            <div className="rounded-lg border bg-background p-6 text-center text-sm text-muted-foreground">
              {messages.form.addOneImage}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {images.map((img) => (
                <div key={img.publicId} className="relative aspect-square overflow-hidden rounded-xl">
                  <Image
                    src={img.url}
                    alt={messages.form.images}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 200px"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((i) => i.publicId !== img.publicId))}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/75"
                    aria-label={messages.form.removeImage}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
            {messages.common.cancel}
          </Button>
          <Button
            type="submit"
            disabled={submit.isPending || uploading || images.length === 0}
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
