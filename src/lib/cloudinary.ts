import "server-only";
import crypto from "crypto";

import { env } from "@/lib/env";

export function createCloudinaryUploadSignature(params: {
  timestamp: number;
  folder: string;
}) {
  const toSign = `folder=${params.folder}&timestamp=${params.timestamp}${env.CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");
  return {
    signature,
    timestamp: params.timestamp,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder: params.folder,
  };
}

