import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
export const getApis = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM sw_api_midtrans WHERE status = 0');
        return successResponse(res, { apis: rows }, 'APIs retrieved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const getApisActive = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM sw_api_midtrans WHERE status = 1');
        return successResponse(res, { apis: rows }, 'Active APIs retrieved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const saveApi = async (req, res) => {
    const { jenis } = req.query;
    const data = req.body;
    if (!data)
        return errorResponse(res, 'body required', 400);
    try {
        if (jenis === 'mst') {
            const [result] = await pool.query('INSERT INTO sw_order SET ?', [data]);
            return successResponse(res, { insertId: result.insertId }, 'Order saved (mst)');
        }
        if (jenis === 'dtl') {
            const [result] = await pool.query('INSERT INTO sw_order_product SET ?', [data]);
            return successResponse(res, { insertId: result.insertId }, 'Order product saved (dtl)');
        }
        if (jenis === 'histori') {
            const [result] = await pool.query('INSERT INTO sw_order_history SET ?', [data]);
            return successResponse(res, { insertId: result.insertId }, 'Order history saved (histori)');
        }
        return errorResponse(res, 'Invalid jenis', 400);
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const updateApi = async (req, res) => {
    const order_id = req.params.order_id ?? req.body.order_id;
    const data = req.body;
    if (!order_id)
        return errorResponse(res, 'order_id required', 400);
    try {
        const [result] = await pool.query('UPDATE sw_order SET ? WHERE order_id = ?', [data, order_id]);
        return successResponse(res, { affectedRows: result.affectedRows }, 'Order updated');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
