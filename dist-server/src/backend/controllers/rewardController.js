import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
export const getRewardDtlx = async (req, res) => {
    const customer_id = req.query.customer_id || (req.body && req.body.customer_id);
    if (!customer_id)
        return errorResponse(res, 'customer_id is required');
    try {
        const query = `
      SELECT (o_p.quantity * o_p.reward) as reward, o.invoice_no, o.order_id, c.firstname as customer_name,
             c.type_user as tipe, o.date_added as tanggal, o.customer_id, o_p.product_id, c.*
      FROM sw_order o
      LEFT JOIN sw_order_product o_p ON o_p.order_id = o.order_id
      LEFT JOIN sw_customer c ON c.customer_id = o.customer_id
      WHERE o.customer_id = ? AND o.order_status_id = 7
      ORDER BY o.date_added ASC
    `;
        const [rows] = await pool.query(query, [customer_id]);
        return successResponse(res, { rewards: rows });
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const getRewardDtl = async (req, res) => {
    const customer_id = req.query.customer_id || (req.body && req.body.customer_id);
    const no_invoice = req.query.no_invoice || (req.body && req.body.no_invoice);
    try {
        let query = `
      SELECT r.reward, r.invoice_no, r.customer_name, r.type_user as tipe, r.tanggal, c.*
      FROM sw_customer c
      LEFT JOIN _reward_dtl r ON r.customer_id = c.customer_id
    `;
        const params = [];
        const where = [];
        if (customer_id) {
            where.push('c.customer_id = ?');
            params.push(customer_id);
        }
        if (no_invoice) {
            where.push('r.order_id = ?');
            params.push(no_invoice);
        }
        if (where.length > 0)
            query += ' WHERE ' + where.join(' AND ');
        query += ' ORDER BY r.tanggal ASC';
        const [rows] = await pool.query(query, params);
        return successResponse(res, { rewards: rows });
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const getRewardMst = async (req, res) => {
    const customer_id = req.query.customer_id;
    try {
        let query = `
      SELECT r.invoice_no, r.order_id, SUM(r.reward) as reward, r.customer_name, r.type_user as tipex,
             o.firstname as nama_invoice, o.type_user as tipe, o.customer_id as cust_id_invoice,
             r.tanggal, DATE_FORMAT(r.tanggal, '%Y%m') as periode, c.*
      FROM sw_customer c
      INNER JOIN sw_customer_reward_dtl r ON c.customer_id = r.customer_id
      LEFT JOIN sw_order o ON r.order_id = o.order_id
      WHERE c.status = 1
    `;
        const params = [];
        if (customer_id) {
            query += ' AND c.customer_id = ?';
            params.push(customer_id);
        }
        query += ' GROUP BY r.invoice_no ORDER BY r.tanggal ASC';
        const [rows] = await pool.query(query, params);
        return successResponse(res, { reward_master: rows });
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const getPointRewards = async (req, res) => {
    const id = req.params.id;
    try {
        if (!id) {
            const [rows] = await pool.query(`SELECT * FROM sw_point_reward WHERE status = '1'`);
            return successResponse(res, { points: rows });
        }
        else {
            const [rows] = await pool.query(`SELECT * FROM sw_point_reward WHERE point_reward_id = ?`, [id]);
            return successResponse(res, { point: rows[0] || null });
        }
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const getPencairan = async (req, res) => {
    const customer_id = req.query.customer_id || (req.body && req.body.customer_id);
    if (!customer_id)
        return errorResponse(res, 'customer_id is required');
    try {
        const query = `
      SELECT cpr.*, pr.name as name_reward, cps.keterangan as status_reward
      FROM sw_customer_point_reward cpr
      LEFT JOIN sw_point_reward pr ON pr.point_reward_id = cpr.point_reward_id
      LEFT JOIN sw_customer_point_reward_status cps ON cps.id = cpr.status
      WHERE cpr.customer_id = ?
      ORDER BY cpr.created_at DESC
    `;
        const [rows] = await pool.query(query, [customer_id]);
        return successResponse(res, { pencairan: rows });
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const storeCairReward = async (req, res) => {
    const data = req.body;
    if (!data || !data.customer_id || !data.point_reward_id)
        return errorResponse(res, 'customer_id and point_reward_id are required');
    try {
        const [result] = await pool.query(`INSERT INTO sw_customer_point_reward (customer_id, point_reward_id, jumlah, tanggal, status) VALUES (?, ?, ?, ?, ?)`, [data.customer_id, data.point_reward_id, data.jumlah || 0, data.tanggal || new Date(), data.status || 0]);
        return successResponse(res, { insertId: result.insertId }, 'Pencairan request stored', 201);
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const updatePointcair = async (req, res) => {
    const data = req.body;
    if (!data || !data.customer_id)
        return errorResponse(res, 'customer_id is required');
    try {
        const keys = Object.keys(data).filter(k => k !== 'customer_id');
        if (keys.length === 0)
            return errorResponse(res, 'No fields to update');
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const params = keys.map(k => data[k]);
        params.push(data.customer_id);
        const [result] = await pool.query(`UPDATE sw_customer_reward SET ${setClause} WHERE customer_id = ?`, params);
        return successResponse(res, { affectedRows: result.affectedRows }, 'Customer reward updated');
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const updatePointcair2 = async (req, res) => {
    const data = req.body;
    if (!data || !data.customer_id)
        return errorResponse(res, 'customer_id is required');
    try {
        const keys = Object.keys(data).filter(k => k !== 'customer_id');
        if (keys.length === 0)
            return errorResponse(res, 'No fields to update');
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const params = keys.map(k => data[k]);
        params.push(data.customer_id);
        const [result] = await pool.query(`UPDATE sw_customer_reward_dtl SET ${setClause} WHERE customer_id = ?`, params);
        return successResponse(res, { affectedRows: result.affectedRows }, 'Customer reward detail updated');
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const getCustomer = async (req, res) => {
    const customer_id = req.query.customer_id || (req.params && req.params.customer_id);
    try {
        let query = `
      SELECT cr.points, c.*, k.nilai_komisi, mw.name as wilayah_sc
      FROM sw_customer c
      LEFT JOIN sw_customer_reward cr ON cr.customer_id = c.customer_id
      LEFT JOIN sw_komisi k ON k.customer_id = c.customer_id
      LEFT JOIN sw_store s ON s.store_id = c.store_id
      LEFT JOIN sw_mst_wilayah mw ON mw.mst_wilayah_id = s.mst_wilayah_id
      WHERE c.status = 1
    `;
        const params = [];
        if (customer_id) {
            query += ' AND c.customer_id = ?';
            params.push(customer_id);
        }
        query += ' ORDER BY c.customer_id DESC';
        const [rows] = await pool.query(query, params);
        return successResponse(res, { customers: rows });
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const getCustomerPointsKomisi = async (req, res) => {
    const customer_id = req.query.customer_id || (req.params && req.params.customer_id);
    if (!customer_id)
        return errorResponse(res, 'customer_id is required');
    try {
        const query = `
      SELECT
        COALESCE(cr.points, 0) as points,
        COALESCE(SUM(k.nilai_komisi), 0) as total_komisi,
        COALESCE(COUNT(o.order_id), 0) as completed_orders
      FROM sw_customer c
      LEFT JOIN sw_customer_reward cr ON cr.customer_id = c.customer_id
      LEFT JOIN sw_komisi k ON k.customer_id = c.customer_id
      LEFT JOIN sw_order o ON o.customer_id = c.customer_id AND o.order_status_id = 7
      WHERE c.customer_id = ? AND c.status = 1
      GROUP BY c.customer_id
    `;
        const [rows] = await pool.query(query, [customer_id]);
        const result = (rows && rows[0]) ? rows[0] : { points: 0, total_komisi: 0, completed_orders: 0 };
        return successResponse(res, { customer_id: Number(customer_id), points: Number(result.points), total_komisi: Number(result.total_komisi), completed_orders: Number(result.completed_orders) });
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const cekKodeKanza = async (req, res) => {
    const kode_kanza = req.query.kode_kanza || (req.body && req.body.kode_kanza);
    if (!kode_kanza)
        return errorResponse(res, 'kode_kanza is required');
    try {
        const [rows] = await pool.query(`SELECT telephone FROM sw_customer WHERE kode_kanza = ? AND type_user = 1`, [kode_kanza]);
        return successResponse(res, { result: rows });
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
