// src/utils/activityLog.js
const { pool } = require('../db');

async function logActivity({
  userId = null,
  action,
  entity = null,
  entityId = null,
  details = null,
  ip = null,
  agent = null,
}) {
  try {
    await pool.query(
      `
      INSERT INTO activity_log
        (user_id, action, entity, entity_id, details, ip_address, user_agent)
      VALUES (?,?,?,?,?,?,?)
      `,
      [
        userId,
        action,
        entity,
        entityId,
        details ? JSON.stringify(details) : null,
        ip,
        agent,
      ]
    );
  } catch (err) {
    console.error('logActivity error:', err.message);
  }
}

module.exports = { logActivity };
