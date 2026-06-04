import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const signupFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(100),
        email: z.string().trim().email().max(255),
        password: z.string().min(6).max(128),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { pool } = await import("@/lib/lovable/database");
    const { hashPassword, createSession } = await import("@/lib/auth.server");
    const exists = await pool.query("SELECT 1 FROM users WHERE email=$1", [
      data.email.toLowerCase(),
    ]);
    if (exists.rowCount && exists.rowCount > 0) {
      return { ok: false, error: "Un compte existe déjà avec cet email." };
    }
    const hash = await hashPassword(data.password);
    try {
      const { rows } = await pool.query(
        "INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id, email, name",
        [data.email.toLowerCase(), hash, data.name],
      );
      await createSession(rows[0].id);
      return { ok: true, user: rows[0] };
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        return { ok: false, error: "Un compte existe déjà avec cet email." };
      }
      throw error;
    }
  });

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().email(),
        password: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { pool } = await import("@/lib/lovable/database");
    const { verifyPassword, createSession } = await import(
      "@/lib/auth.server"
    );
    const { rows } = await pool.query(
      "SELECT id, email, name, password_hash FROM users WHERE email=$1",
      [data.email.toLowerCase()],
    );
    const u = rows[0];
    if (!u || !(await verifyPassword(data.password, u.password_hash))) {
      return { ok: false, error: "Email ou mot de passe incorrect." };
    }
    await createSession(u.id);
    return { ok: true, user: { id: u.id, email: u.email, name: u.name } };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { clearSession } = await import("@/lib/auth.server");
  await clearSession();
  return { ok: true };
});

export const meFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getCurrentUser } = await import("@/lib/auth.server");
  return await getCurrentUser();
});
