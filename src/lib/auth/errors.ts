// Maps Supabase Auth error codes to French UI messages. Never leaks whether an account exists.
const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email ou mot de passe incorrect",
  email_not_confirmed: "Compte non validé : saisis le code reçu par email",
  otp_expired: "Code invalide ou expiré",
  weak_password: "Mot de passe trop faible",
  same_password: "Choisis un mot de passe différent de l'ancien",
  over_email_send_rate_limit: "Trop d'emails envoyés, réessaie dans quelques minutes",
  over_request_rate_limit: "Trop de tentatives, réessaie dans quelques minutes",
  email_address_invalid: "Adresse email refusée",
  unexpected_failure: "Adresse email refusée",
};

export function authErrorMessage(code: string | undefined): string {
  return (code && MESSAGES[code]) || "Une erreur est survenue, réessaie";
}
