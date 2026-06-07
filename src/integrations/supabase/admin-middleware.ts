import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth-middleware";

/**
 * requireAdmin : exige une session valide + le rôle 'admin' dans user_roles.
 * Renvoie 403 sinon.
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Forbidden: admin role required");
    return next({ context: { ...context, isAdmin: true as const } });
  });
