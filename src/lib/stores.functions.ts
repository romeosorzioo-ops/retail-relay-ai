import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const storeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  banner: z.string().min(1),
  city: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  tone: z.string().max(40).optional().nullable(),
  frequency: z.string().max(40).optional().nullable(),
  strong_departments: z.array(z.string()).default([]),
});

export const getMyStoreFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { pool } = await import("@/lib/lovable/database");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();
    const { rows } = await pool.query(
      "SELECT * FROM stores WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1",
      [user.id],
    );
    return rows[0] ?? null;
  },
);

export const upsertStoreFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => storeSchema.parse(d))
  .handler(async ({ data }) => {
    const { pool } = await import("@/lib/lovable/database");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();
    const existing = await pool.query(
      "SELECT id FROM stores WHERE user_id=$1 LIMIT 1",
      [user.id],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      const id = existing.rows[0].id;
      const { rows } = await pool.query(
        `UPDATE stores SET name=$1, banner=$2, city=$3, description=$4,
         tone=$5, frequency=$6, strong_departments=$7 WHERE id=$8 RETURNING *`,
        [
          data.name,
          data.banner,
          data.city ?? null,
          data.description ?? null,
          data.tone ?? null,
          data.frequency ?? null,
          data.strong_departments,
          id,
        ],
      );
      return rows[0];
    }
    const { rows } = await pool.query(
      `INSERT INTO stores (user_id, name, banner, city, description, tone, frequency, strong_departments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        user.id,
        data.name,
        data.banner,
        data.city ?? null,
        data.description ?? null,
        data.tone ?? null,
        data.frequency ?? null,
        data.strong_departments,
      ],
    );
    return rows[0];
  });
