import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type NewAccount = { email: string; password: string; displayName: string; className: string };

/** Validates an account at once: the emailed code is informative, nobody has to enter it. */
export async function confirmAccount(userId: string, password?: string) {
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    email_confirm: true,
    ...(password ? { password } : {}),
  });
  return !error;
}

/** Account created without email, when the mail service fails. The domain and class triggers still apply. */
export async function createConfirmedAccount({ email, password, displayName, className }: NewAccount) {
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, class_name: className },
  });
  return !error;
}

/** Validates an account still waiting for its code. Call only once its password has been checked. */
export async function confirmPendingAccount(email: string) {
  const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email === email);
  return user ? confirmAccount(user.id) : false;
}
