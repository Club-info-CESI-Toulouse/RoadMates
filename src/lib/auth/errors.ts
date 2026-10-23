import "server-only";

// Maps Supabase Auth errors to precise French UI messages, without revealing
// whether an account exists. Unknown errors are logged (no email, no secret).
const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email ou mot de passe incorrect",
  email_not_confirmed: "Compte non validé : saisis le code reçu par email",
  otp_expired: "Code invalide ou expiré",
  weak_password: "Mot de passe trop faible : mélange lettres, chiffres et symboles",
  same_password: "Le nouveau mot de passe doit être différent de l'ancien",
  over_email_send_rate_limit:
    "Trop d'emails envoyés à cette adresse : attends quelques minutes avant de réessayer",
  over_request_rate_limit: "Trop de tentatives depuis cet appareil : réessaie dans quelques minutes",
  email_address_invalid: "Adresse email refusée par le service d'envoi",
  email_address_not_authorized: "Le service d'envoi refuse cette adresse",
  signup_disabled: "Les inscriptions sont fermées pour le moment",
  email_provider_disabled: "La connexion par email est désactivée pour le moment",
  user_banned: "Ce compte est suspendu",
  validation_failed: "Données invalides : vérifie l'email et le mot de passe",
  request_timeout: "Le serveur met trop de temps à répondre : réessaie",
};

type AuthErrorLike = { code?: string; message?: string; status?: number };

export function authErrorMessage(context: string, error: AuthErrorLike): string {
  const known = error.code && MESSAGES[error.code];
  if (known) return known;

  const message = error.message ?? "";
  console.error(`[auth] ${context}: code=${error.code} status=${error.status} ${message}`);

  if (/sending|smtp|mail/i.test(message))
    return "Le code n'a pas pu être envoyé par email (service d'envoi indisponible). Réessaie dans quelques minutes";
  if (/database error/i.test(message))
    return "Inscription refusée : seules les adresses @viacesi.fr sont acceptées";
  if (error.status === 0 || /fetch|network/i.test(message))
    return "Serveur injoignable : vérifie ta connexion et réessaie";
  return `Erreur inattendue (${error.code ?? error.status ?? "inconnue"}) : réessaie, ou préviens l'équipe si ça persiste`;
}
