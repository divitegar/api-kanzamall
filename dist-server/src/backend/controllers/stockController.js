import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
// Stock related endpoints ported from legacy model
export const getStock = async (req, res) => {
    const store_id = req.query.store_id;
    const product_id = req.query.product_id;
    try {
        let whereClauses = [`status = 1`, `trash = 0`];
        const params = [];
        if (store_id) {
            whereClauses.push(`store_id = ?`);
            params.push(store_id);
        }
        if (product_id) {
            whereClauses.push(`product_id = ?`);
            params.push(product_id);
        }
        const query = `
      SELECT store_id, product_id, SUM(sisa) as jml
      FROM sw_product_to_store_dtl
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY store_id, product_id
    `;
        const [rows] = await pool.query(query, params);
        return successResponse(res, { stocks: rows });
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const getStoreWilayah = async (req, res) => {
    const mst_wilayah_id = req.query.mst_wilayah_id;
    try {
        const conn = await pool.getConnection();
        try {
            if (!mst_wilayah_id) {
                // return all active wilayah
                const [rows] = await conn.query(`
          SELECT mw.*, s.store_id, s.name as store_name, s.code_origin
          FROM sw_mst_wilayah mw
          LEFT JOIN sw_store s ON s.mst_wilayah_id = mw.mst_wilayah_id
          WHERE mw.status = 1 AND mw.trash = 0
          ORDER BY mw.urut_jarak ASC
        `);
                return successResponse(res, { wilayah: rows });
            }
            // find urut_jarak for given mst_wilayah_id
            const [r] = await conn.query(`SELECT urut_jarak FROM sw_mst_wilayah WHERE mst_wilayah_id = ? AND status = 1 AND trash = 0`, [mst_wilayah_id]);
            if (!r || r.length === 0) {
                return errorResponse(res, 'mst_wilayah not found', 404);
            }
            const urut = Number(r[0].urut_jarak);
            const wilayah1 = urut - 1;
            const wilayah2 = urut + 1;
            const [rows] = await conn.query(`
        SELECT mw.*, s.store_id, s.name as store_name, s.code_origin
        FROM sw_mst_wilayah mw
        LEFT JOIN sw_store s ON s.mst_wilayah_id = mw.mst_wilayah_id
        WHERE (mw.urut_jarak = ? OR mw.urut_jarak = ?) AND mw.status = 1 AND mw.trash = 0
        ORDER BY mw.urut_jarak ASC
      `, [wilayah1, wilayah2]);
            return successResponse(res, { wilayah: rows });
        }
        finally {
            conn.release();
        }
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const saveOrder = async (req, res) => {
    const { data, jenis } = req.body;
    if (!data || !jenis)
        return errorResponse(res, 'data and jenis are required');
    try {
        if (jenis === 'mst') {
            const fields = Object.keys(data);
            const placeholders = fields.map(() => '?').join(', ');
            const params = fields.map((k) => data[k]);
            const [result] = await pool.query(`INSERT INTO sw_order (${fields.join(',')}) VALUES (${placeholders})`, params);
            return successResponse(res, { insertId: result.insertId }, 'Order created', 201);
        }
        if (jenis === 'dtl') {
            const fields = Object.keys(data);
            const placeholders = fields.map(() => '?').join(', ');
            const params = fields.map((k) => data[k]);
            const [result] = await pool.query(`INSERT INTO sw_order_product (${fields.join(',')}) VALUES (${placeholders})`, params);
            return successResponse(res, { insertId: result.insertId }, 'Order product created', 201);
        }
        if (jenis === 'histori') {
            const fields = Object.keys(data);
            const placeholders = fields.map(() => '?').join(', ');
            const params = fields.map((k) => data[k]);
            const [result] = await pool.query(`INSERT INTO sw_order_history (${fields.join(',')}) VALUES (${placeholders})`, params);
            return successResponse(res, { insertId: result.insertId }, 'Order history created', 201);
        }
        return errorResponse(res, 'Unknown jenis');
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const updateOrder = async (req, res) => {
    const { data, order_id } = req.body;
    if (!data || !order_id)
        return errorResponse(res, 'data and order_id are required');
    try {
        const keys = Object.keys(data);
        if (keys.length === 0)
            return errorResponse(res, 'No fields to update');
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const params = keys.map(k => data[k]);
        params.push(order_id);
        const [result] = await pool.query(`UPDATE sw_order SET ${setClause} WHERE order_id = ?`, params);
        return successResponse(res, { affectedRows: result.affectedRows }, 'Order updated');
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
export const getProdukStore = async (req, res) => {
    const product_id = req.query.product_id;
    const store_id = req.query.store_id;
    if (!product_id)
        return errorResponse(res, 'product_id is required');
    try {
        let where = `s.status = 1 AND s.trash = 0 AND ptd.product_id = ?`;
        const params = [product_id];
        if (store_id) {
            where += ' AND ptd.store_id = ?';
            params.push(store_id);
        }
        const query = `
      SELECT ptd.product_id, ptd.store_id, SUM(ptd.sisa) as jml,
             pd.name as nama_produk, mw.name as nama_wilayah, s.name as nama_toko
      FROM sw_product_to_store_dtl ptd
      LEFT JOIN sw_product_description pd ON pd.product_id = ptd.product_id
      LEFT JOIN sw_store s ON s.store_id = ptd.store_id
      LEFT JOIN sw_mst_wilayah mw ON mw.mst_wilayah_id = s.mst_wilayah_id
      WHERE ${where}
      GROUP BY ptd.product_id, ptd.store_id
      ORDER BY ptd.store_id
    `;
        const [rows] = await pool.query(query, params);
        return successResponse(res, { produk_store: rows });
    }
    catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
