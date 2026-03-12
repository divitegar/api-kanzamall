import { Router } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
const router = Router();
// GET /api/terms or /api/terms/:id
router.get('/terms', async (req, res) => {
    const terms_id = req.query.terms_id || req.params['id'];
    try {
        if (!terms_id) {
            const [rows] = await pool.query('SELECT * FROM sw_terms_condition WHERE status = 1');
            return successResponse(res, { terms: rows });
        }
        else {
            const [rows] = await pool.query('SELECT * FROM sw_terms_condition WHERE terms_id = ? AND status = 1', [terms_id]);
            return successResponse(res, { terms: rows[0] || null });
        }
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
});
export default router;
