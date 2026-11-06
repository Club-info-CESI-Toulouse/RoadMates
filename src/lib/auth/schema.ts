import { z } from "zod";

export const ALLOWED_EMAIL_DOMAIN = "viacesi.fr";
export const PASSWORD_MIN_LENGTH = 8;
export const DISPLAY_NAME_MAX_LENGTH = 40;
export const CODE_LENGTH = 6;
export const CLASS_NAME_MAX_LENGTH = 60;
export const MAX_CODE_ATTEMPTS = 5;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Adresse email invalide"))
  .refine(
    (email) => email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`),
    `Utilise ton adresse @${ALLOWED_EMAIL_DOMAIN}`,
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Indique un pseudo ou un prénom")
  .max(DISPLAY_NAME_MAX_LENGTH, `${DISPLAY_NAME_MAX_LENGTH} caractères maximum`);

export const classNameSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "Choisis ta classe")
      .max(CLASS_NAME_MAX_LENGTH, `${CLASS_NAME_MAX_LENGTH} caractères maximum`),
  );

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `${PASSWORD_MIN_LENGTH} caractères minimum`)
  .max(72, "72 caractères maximum");

const withConfirmation = <T extends { password: string; passwordConfirm: string }>(
  data: T,
) => data.password === data.passwordConfirm;
const confirmationError = {
  message: "Les deux mots de passe ne correspondent pas : ressaisis-les",
  path: ["passwordConfirm"],
};

export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, `Code à ${CODE_LENGTH} chiffres`);

export const signUpSchema = z
  .object({
    email: emailSchema,
    password,
    passwordConfirm: z.string(),
    displayName: displayNameSchema,
    className: classNameSchema,
  })
  .refine(withConfirmation, confirmationError);

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis"),
});

export const resetPasswordSchema = z
  .object({
    code: codeSchema,
    password,
    passwordConfirm: z.string(),
  })
  .refine(withConfirmation, confirmationError);
