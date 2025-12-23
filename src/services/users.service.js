import { pool } from "../config/db.js";

export async function getUsers() {
  const [rows] = await pool.query(
    `
    SELECT 
      id,
      name,
      username,
      role_id,
      active
    FROM users
    `
  );

  return rows;
}

export async function createUser({ name, username, passwordHash, roleId }) {
  const [result] = await pool.query(
    `
    INSERT INTO users (name, username, password_hash, role_id, active)
    VALUES (?, ?, ?, ?, 1)
    `,
    [name, username, passwordHash, roleId]
  );

  return result.insertId;
}

export async function toggleUser(id) {
  await pool.query(
    `
    UPDATE users
    SET active = IF(active = 1, 0, 1)
    WHERE id = ?
    `,
    [id]
  );
}

export async function deleteUser(id) {
  await pool.query(
    `DELETE FROM users WHERE id = ?`,
    [id]
  );
}

export async function getAllUsers() {
  const [rows] = await pool.query(`
    SELECT
      id,
      name,
      role_id AS role
    FROM users
    ORDER BY name ASC
  `);

  return rows;
}
