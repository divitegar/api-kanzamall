import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
const toNum = (v) => {
    if (v === undefined || v === null)
        return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
};
export const getOrders = async (req, res) => {
    const orderIdParam = req.params.order_id ?? req.query.order_id;
    const order_id = orderIdParam !== undefined ? String(orderIdParam) : undefined;
    try {
        let query = `
      SELECT o.*, os.name as status_name
      FROM sw_order o
      LEFT JOIN sw_order_status os ON o.order_status_id = os.order_status_id
    `;
        const params = [];
        if (order_id) {
            query += ' WHERE o.order_id = ?';
            params.push(order_id);
        }
        const [rows] = await pool.query(query, params);
        return successResponse(res, { orders: rows }, 'Orders retrieved successfully');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const saveOrderHistory = async (req, res) => {
    const data = req.body;
    if (!data)
        return errorResponse(res, 'body is required', 400);
    try {
        const [result] = await pool.query('INSERT INTO sw_order_history SET ?', [data]);
        return successResponse(res, { insertId: result.insertId }, 'Order history saved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const searchOrders = async (req, res) => {
    const keyword = req.query.keyword ? String(req.query.keyword) : '';
    try {
        const q = `
      SELECT * FROM sw_order
      WHERE firstname LIKE ? OR email LIKE ? OR telephone LIKE ? OR currency_value LIKE ? OR hp_distributor LIKE ?
      LIMIT 200
    `;
        const kw = `%${keyword}%`;
        const [rows] = await pool.query(q, [kw, kw, kw, kw, kw]);
        return successResponse(res, { results: rows }, 'Search results');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const updateOrder = async (req, res) => {
    const order_id = toNum(req.params.order_id);
    const data = req.body;
    if (!order_id)
        return errorResponse(res, 'order_id is required', 400);
    try {
        const [result] = await pool.query('UPDATE sw_order SET ? WHERE order_id = ?', [data, order_id]);
        return successResponse(res, { affectedRows: result.affectedRows }, 'Order updated');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const getCustMember = async (req, res) => {
    try {
        const query = `
      SELECT o.customer_id, o.firstname, MAX(o.date_added) as tgl, os.name as status_name
      FROM sw_order o
      LEFT JOIN sw_order_status os ON o.order_status_id = os.order_status_id
      WHERE o.date_added >= (NOW() - INTERVAL 3 DAY)
      GROUP BY o.customer_id
    `;
        const [rows] = await pool.query(query);
        return successResponse(res, { customers: rows }, 'Customer members retrieved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const getKomisiOrders = async (req, res) => {
    const date_start = req.query.date_start ? String(req.query.date_start) : undefined;
    const date_finish = req.query.date_finish ? String(req.query.date_finish) : undefined;
    try {
        let query = `
      SELECT o.*, os.name as status_name, c.firstname as nama_cust
      FROM sw_order o
      LEFT JOIN sw_order_status os ON o.order_status_id = os.order_status_id
      LEFT JOIN sw_customer c ON o.customer_id = c.customer_id
      WHERE o.order_status_id = 7 AND o.hitung_komisi = 0
    `;
        const params = [];
        if (date_start) {
            query += ' AND DATE(o.date_added) >= ?';
            params.push(date_start);
        }
        if (date_finish) {
            query += ' AND DATE(o.date_added) <= ?';
            params.push(date_finish);
        }
        query += ' GROUP BY o.order_id ORDER BY o.date_added, o.order_id ASC';
        const [rows] = await pool.query(query, params);
        return successResponse(res, { komisi: rows }, 'Komisi orders retrieved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
export const saveKomisi = async (req, res) => {
    const data = req.body;
    if (!data)
        return errorResponse(res, 'body is required', 400);
    try {
        const [result] = await pool.query('INSERT INTO sw_komisi SET ?', [data]);
        return successResponse(res, { insertId: result.insertId }, 'Komisi saved');
    }
    catch (err) {
        return errorResponse(res, err.message || 'DB error', 500);
    }
};
