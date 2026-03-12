import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
export const getReviews = async (req, res) => {
    const rawProductId = req.params.product_id ?? req.query.product_id ?? req.query.productId;
    const productId = String(rawProductId ?? '').trim();
    const rawBatas = Number(req.query.batas);
    const batas = Number.isFinite(rawBatas) && rawBatas > 0 ? Math.floor(rawBatas) : 15;
    if (!productId)
        return errorResponse(res, 'product_id required', 400);
    try {
        const q = `SELECT r.*, c.firstname as nama_cust, c.image FROM sw_review r
               LEFT JOIN sw_customer c ON c.customer_id = r.customer_id
               WHERE r.status = 1 AND r.product_id = ? LIMIT ?`;
        const [rows] = await pool.query(q, [productId, batas]);
        return successResponse(res, { reviews: rows }, 'Reviews retrieved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const getCustomerReviews = async (req, res) => {
    const rawCustomerId = req.params.customer_id ?? req.query.customer_id ?? req.query.customerId ?? req.params.id;
    const customerId = String(rawCustomerId ?? '').trim();
    const rawBatas = Number(req.query.batas);
    const batas = Number.isFinite(rawBatas) && rawBatas > 0 ? Math.floor(rawBatas) : 15;
    if (!customerId)
        return errorResponse(res, 'customer_id required', 400);
    try {
        const q = `SELECT r.*, c.firstname as nama_cust, pdd.name, p.sku, p.image FROM sw_review r
               LEFT JOIN sw_product p ON p.product_id = r.product_id
               LEFT JOIN sw_product_description pdd ON pdd.product_id = r.product_id AND pdd.language_id = 1
               LEFT JOIN sw_customer c ON c.customer_id = r.customer_id
               WHERE r.customer_id = ?
               ORDER BY r.date_added DESC
               LIMIT ?`;
        const [rows] = await pool.query(q, [customerId, batas]);
        return successResponse(res, { reviews: rows }, 'Customer reviews retrieved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const saveReview = async (req, res) => {
    const data = req.body;
    if (!data)
        return errorResponse(res, 'body required', 400);
    try {
        const [result] = await pool.query('INSERT INTO sw_review SET ?', [data]);
        return successResponse(res, { insertId: result.insertId }, 'Review saved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
