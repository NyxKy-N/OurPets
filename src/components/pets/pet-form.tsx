"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";

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

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Something went wrong";
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
      toast.success(mode === "create" ? "Pet created" : "Pet updated");
      await qc.invalidateQueries({ queryKey: ["pets"] });
      router.push(`/pet/${pet.id}`);
    },
    onError: (err: unknown) => toast.error(errorMessage(err) ?? "Failed to save pet"),
  });

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (images.length + files.length > 8) {
      toast.error("You can upload up to 8 images.");
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
      toast.success("Images uploaded");
    } catch (err: unknown) {
      toast.error(errorMessage(err) ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === "create" ? "Add a pet" : "Edit pet"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add a great photo and a short description. Images are stored on Cloudinary.
      </p>

      <form
        className="mt-6 grid gap-6"
        onSubmit={form.handleSubmit((values) => submit.mutate(values))}
      >
        <div className="grid gap-2">
          <label className="text-sm font-medium">Name</label>
          <Input {...form.register("name")} placeholder="e.g. Mochi" />
          {form.formState.errors.name ? (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Age</label>
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
            <label className="text-sm font-medium">Type</label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              {...form.register("type")}
            >
              <option value="DOG">Dog</option>
              <option value="CAT">Cat</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            rows={6}
            {...form.register("description")}
            placeholder="What makes them special?"
          />
          {form.formState.errors.description ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.description.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Images</label>
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
              Add at least 1 image.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((img) => (
                <div key={img.publicId} className="relative aspect-square overflow-hidden rounded-xl">
                  <Image
                    src={img.url}
                    alt="Uploaded pet"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 200px"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((i) => i.publicId !== img.publicId))}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/75"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={submit.isPending || uploading || images.length === 0}>
            {submit.isPending ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
