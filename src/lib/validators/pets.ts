import { z } from "zod";

export const petTypeSchema = z.enum(["DOG", "CAT", "OTHER"]);
export const petGenderSchema = z.enum(["MALE", "FEMALE", "UNKNOWN"]);
export const petSortSchema = z.enum(["LATEST", "POPULAR"]);

export const petImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const currentYear = new Date().getFullYear();
const birthDateIssue = "Invalid birth date";

function validateBirthDate(
  value: { birthYear?: number; birthMonth?: number },
  ctx: z.RefinementCtx
) {
  if (value.birthYear === undefined && value.birthMonth === undefined) return;

  if (value.birthYear === undefined || value.birthMonth === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["birthMonth"],
      message: birthDateIssue,
    });
    return;
  }

  const birthDate = new Date(Date.UTC(value.birthYear, value.birthMonth - 1, 1));
  const now = new Date();
  const minDate = new Date(Date.UTC(currentYear - 40, 0, 1));
  const maxDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  if (Number.isNaN(birthDate.getTime()) || birthDate < minDate || birthDate > maxDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["birthMonth"],
      message: birthDateIssue,
    });
  }
}

const basePetSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    birthYear: z.number().int().min(currentYear - 40).max(currentYear),
    birthMonth: z.number().int().min(1).max(12),
    type: petTypeSchema,
    gender: petGenderSchema.optional(),
    breed: z.string().trim().max(80).optional(),
    isNeutered: z.boolean().optional(),
    description: z.string().trim().min(1).max(2000),
    images: z.array(petImageSchema).min(1).max(8),
  })
  .superRefine(validateBirthDate);

export const createPetSchema = basePetSchema;

export const updatePetSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    birthYear: z.number().int().min(currentYear - 40).max(currentYear).optional(),
    birthMonth: z.number().int().min(1).max(12).optional(),
    type: petTypeSchema.optional(),
    gender: petGenderSchema.optional(),
    breed: z.string().trim().max(80).optional(),
    isNeutered: z.boolean().optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    images: z.array(petImageSchema).min(1).max(8).optional(),
  })
  .superRefine(validateBirthDate)
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field must be updated",
  });

export const listPetsQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
  q: z.string().trim().min(1).max(80).optional(),
  type: petTypeSchema.optional(),
  sort: petSortSchema.default("LATEST"),
  ownerId: z.string().cuid().optional(),
  ageMin: z.coerce.number().int().min(0).max(40).optional(),
  ageMax: z.coerce.number().int().min(0).max(40).optional(),
});
