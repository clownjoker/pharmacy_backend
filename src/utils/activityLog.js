import { pool } from "../config/db.js";

export async function logActivity({
  userId,
  action,
  entity,
  entityId,
  ip,
  agent,
}) {
  try {
    await pool.query(
      `
      INSERT INTO activity_logs
        (user_id, action, entity, entity_id, ip, agent)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        userId || null,
        action,
        entity,
        entityId || null,
        ip || null,
        agent || null,
      ]
    );
  } catch (err) {
    console.error("logActivity error:", err.message);
  }
}
