import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
export const getTutorials = async (req, res) => {
    const id = req.query.tutorial_id || req.params['id'];
    try {
        if (!id) {
            const [rows] = await pool.query(`
        SELECT l.name as language_name, t.*
        FROM sw_tutorial t
        LEFT JOIN sw_language l ON l.language_id = t.language_id
        WHERE t.published = 1
        ORDER BY t.tutorial_id DESC
      `);
            return successResponse(res, { tutorials: rows });
        }
        else {
            const [rows] = await pool.query(`
        SELECT l.name as language_name, t.*
        FROM sw_tutorial t
        LEFT JOIN sw_language l ON l.language_id = t.language_id
        WHERE t.published = 1 AND t.tutorial_id = ?
      `, [id]);
            return successResponse(res, { tutorial: rows[0] || null });
        }
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export default {
    getTutorials
};
