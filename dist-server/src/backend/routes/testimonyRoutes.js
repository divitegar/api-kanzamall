import { Router } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
const router = Router();
router.get('/testimonies', async (req, res) => {
    const id = req.query.testimoni_id || req.params['id'];
    try {
        if (!id) {
            const [rows] = await pool.query(`
        SELECT l.name as language_name, t.*
        FROM sw_testimoni t
        LEFT JOIN sw_language l ON l.language_id = t.language_id
        WHERE t.published = 1
        ORDER BY t.testimoni_id DESC
      `);
            return successResponse(res, { testimonies: rows });
        }
        else {
            const [rows] = await pool.query(`
        SELECT l.name as language_name, t.*
        FROM sw_testimoni t
        LEFT JOIN sw_language l ON l.language_id = t.language_id
        WHERE t.published = 1 AND t.testimoni_id = ?
      `, [id]);
            return successResponse(res, { testimony: rows[0] || null });
        }
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
});
export default router;
