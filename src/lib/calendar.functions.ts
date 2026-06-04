import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listCalendarFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { pool } = await import("@/lib/lovable/database");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();
    const { rows } = await pool.query(
      `SELECT cp.*, gc.facebook_post, gc.instagram_post, gc.instagram_story, gc.reel_idea,
              p.product_name as promo_name
       FROM calendar_posts cp
       LEFT JOIN generated_contents gc ON gc.id = cp.generated_content_id
       LEFT JOIN promotions p ON p.id = gc.promotion_id
       WHERE cp.user_id=$1 ORDER BY cp.scheduled_date ASC`,
      [user.id],
    );
    return rows;
  },
);

export const addCalendarPostFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        generated_content_id: z.string().uuid(),
        channel: z.string().min(1).max(40),
        scheduled_date: z.string().min(8),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { pool } = await import("@/lib/lovable/database");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();
    const { rows } = await pool.query(
      `INSERT INTO calendar_posts (user_id, generated_content_id, channel, scheduled_date)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [user.id, data.generated_content_id, data.channel, data.scheduled_date],
    );
    return rows[0];
  });

export const moveCalendarPostFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid(), scheduled_date: z.string().min(8) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { pool } = await import("@/lib/lovable/database");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();
    await pool.query(
      "UPDATE calendar_posts SET scheduled_date=$1 WHERE id=$2 AND user_id=$3",
      [data.scheduled_date, data.id, user.id],
    );
    return { ok: true };
  });

export const deleteCalendarPostFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { pool } = await import("@/lib/lovable/database");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();
    await pool.query("DELETE FROM calendar_posts WHERE id=$1 AND user_id=$2", [
      data.id,
      user.id,
    ]);
    return { ok: true };
  });

export const dashboardStatsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { pool } = await import("@/lib/lovable/database");
    const { requireUser } = await import("@/lib/auth.server");
    const user = await requireUser();
    const [p, c, cal] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS n FROM promotions WHERE user_id=$1", [
        user.id,
      ]),
      pool.query(
        "SELECT COUNT(*)::int AS n FROM generated_contents WHERE user_id=$1",
        [user.id],
      ),
      pool.query(
        "SELECT COUNT(*)::int AS n FROM calendar_posts WHERE user_id=$1",
        [user.id],
      ),
    ]);
    return {
      promotions: p.rows[0].n,
      contents: c.rows[0].n,
      planned: cal.rows[0].n,
    };
  },
);
