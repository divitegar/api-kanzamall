import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
export const getProductRelated = async (req, res) => {
    const product_id = req.params.product_id ?? req.query.product_id;
    const batas = req.query.batas ? Number(req.query.batas) : 5;
    if (!product_id)
        return errorResponse(res, 'product_id required', 400);
    try {
        const q = `SELECT pd.name, p.* FROM sw_product_related pr
               LEFT JOIN sw_product p ON p.product_id = pr.related_id
               LEFT JOIN sw_product_description pd ON pd.product_id = pr.related_id AND pd.language_id = 1
               WHERE pr.product_id = ? AND p.trash = '0' AND p.status = 1
               LIMIT ?`;
        const [rows] = await pool.query(q, [Number(product_id), batas]);
        return successResponse(res, { related: rows }, 'Product related retrieved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
