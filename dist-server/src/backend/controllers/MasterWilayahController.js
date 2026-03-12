import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
export const getMstWilayah = async (req, res) => {
    try {
        const q = `SELECT * FROM sw_mst_wilayah WHERE status = 1 AND trash = 0`;
        const [rows] = await pool.query(q);
        return successResponse(res, { wilayah: rows }, 'Master wilayah retrieved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const getScWilayah = async (req, res) => {
    const id = req.params.mst_wilayah_id ?? req.query.mst_wilayah_id ?? '1';
    try {
        const q = `SELECT * FROM sw_mst_wilayah WHERE status = 1 AND trash = 0 AND mst_wilayah_id = ?`;
        const [rows] = await pool.query(q, [Number(id)]);
        return successResponse(res, { wilayah: rows }, 'sc wilayah retrieved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const cekWilayah = async (req, res) => {
    const city_id = req.query.city_id || req.params.city_id || undefined;
    try {
        let query = `
      SELECT IF(ISNULL(s.store_id), '2', s.store_id) as store_id,
             IF(ISNULL(s.store_id), 'KANZA MALL', s.name) as store_name,
             d.*
      FROM sw_dtl_wilayah d
      LEFT JOIN sw_store s ON d.mst_wilayah_id = s.mst_wilayah_id AND s.status = 1 AND s.trash = 0
      WHERE d.status = 1 AND d.trash = 0
    `;
        const params = [];
        if (city_id) {
            query += ' AND d.city_id = ?';
            params.push(city_id);
        }
        query += ' ORDER BY d.some_order_column ASC'; // keep ordering flexible; replace if specific order needed
        const [rows] = await pool.query(query, params);
        return successResponse(res, { wilayah: rows });
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
