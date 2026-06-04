import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const promoSchema = z.object({
  product_name: z.string().trim().min(1).max(200),
  price: z.number().nullable().optional(),
  old_price: z.number().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  photo_url: z.string().max(2000).nullable().optional(),
});

export const listPromotionsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { pool } = await import("@/lib/lovable/database");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();
    const { rows } = await pool.query(
      "SELECT * FROM promotions WHERE user_id=$1 ORDER BY created_at DESC",
      [user.id],
    );
    return rows;
  },
);

export const createPromotionFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => promoSchema.parse(d))
  .handler(async ({ data }) => {
    const { pool } = await import("@/lib/lovable/database");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();
    const store = await pool.query(
      "SELECT id FROM stores WHERE user_id=$1 LIMIT 1",
      [user.id],
    );
    const { rows } = await pool.query(
      `INSERT INTO promotions (user_id, store_id, product_name, price, old_price, start_date, end_date, category, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        user.id,
        store.rows[0]?.id ?? null,
        data.product_name,
        data.price ?? null,
        data.old_price ?? null,
        data.start_date ?? null,
        data.end_date ?? null,
        data.category ?? null,
        data.photo_url ?? null,
      ],
    );
    return rows[0];
  });

export const deletePromotionFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { pool } = await import("@/lib/lovable/database");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();
    await pool.query("DELETE FROM promotions WHERE id=$1 AND user_id=$2", [
      data.id,
      user.id,
    ]);
    return { ok: true };
  });
