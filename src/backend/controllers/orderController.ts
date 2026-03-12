import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

const toNum = (v: any) => (v === undefined || v === null) ? undefined : Number(v);

export const getOrders = async (req: Request, res: Response) => {
  const customer_id = req.query.customer_id ?? req.params.customer_id;
  const order_id = req.query.order_id ?? req.params.order_id;
  try {
    let query = `SELECT o.*, os.name as status_name FROM sw_order o LEFT JOIN sw_order_status os ON o.order_status_id = os.order_status_id`;
    const params: any[] = [];
    if (order_id) {
      query += ' WHERE o.order_id = ?';
      params.push(order_id);
    } else if (customer_id) {
      query += ' WHERE o.customer_id = ?';
      params.push(customer_id);
    }
    query += ' ORDER BY o.order_id DESC';
    const [rows] = await pool.query(query, params);
    return successResponse(res, { orders: rows }, 'Orders retrieved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getOrderProducts = async (req: Request, res: Response) => {
  const order_id = req.query.order_id ?? req.params.order_id;
  try {
    let query = `SELECT op.* FROM sw_order_product op`;
    const params: any[] = [];
    if (order_id) {
      query += ' WHERE op.order_id = ?';
      params.push(order_id);
    }
    const [rows] = await pool.query(query, params);
    return successResponse(res, { products: rows }, 'Order products retrieved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const saveOrder = async (req: Request, res: Response) => {
  const jenis = req.query.jenis ?? req.body.jenis;
  const data = req.body;
  if (!data) return errorResponse(res, 'body required', 400);
  try {
    if (jenis === 'mst') {
      const [result]: any = await pool.query('INSERT INTO sw_order SET ?', [data]);
      return successResponse(res, { insertId: result.insertId }, 'Order mst saved');
    }
    if (jenis === 'dtl') {
      const [result]: any = await pool.query('INSERT INTO sw_order_product SET ?', [data]);
      return successResponse(res, { insertId: result.insertId }, 'Order product saved');
    }
    if (jenis === 'histori') {
      const [result]: any = await pool.query('INSERT INTO sw_order_history SET ?', [data]);
      return successResponse(res, { insertId: result.insertId }, 'Order history saved');
    }
    return errorResponse(res, 'Invalid jenis', 400);
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  const order_id = req.params.order_id ?? req.body.order_id;
  const data = req.body;
  if (!order_id) return errorResponse(res, 'order_id required', 400);
  try {
    const [result]: any = await pool.query('UPDATE sw_order SET ? WHERE order_id = ?', [data, order_id]);
    return successResponse(res, { affectedRows: result.affectedRows }, 'Order updated');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const updateOrderHistori = async (req: Request, res: Response) => {
  const order_id = req.params.order_id ?? req.body.order_id;
  const data = req.body;
  if (!order_id) return errorResponse(res, 'order_id required', 400);
  try {
    const [result]: any = await pool.query('UPDATE sw_order_history SET ? WHERE order_id = ?', [data, order_id]);
    return successResponse(res, { affectedRows: result.affectedRows }, 'Order history updated');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const saveTest = async (req: Request, res: Response) => {
  const data = req.body;
  if (!data) return errorResponse(res, 'body required', 400);
  try {
    const [result]: any = await pool.query('INSERT INTO sw_test SET ?', [data]);
    return successResponse(res, { insertId: result.insertId }, 'Test saved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const mutasiStok = async (req: Request, res: Response) => {
  const order_id = req.params.order_id ?? req.query.order_id;
  if (!order_id) return errorResponse(res, 'order_id required', 400);
  try {
    const [rows]: any = await pool.query(`SELECT o.store_id, op.product_id, op.quantity FROM sw_order_product op LEFT JOIN sw_order o ON o.order_id = op.order_id WHERE op.order_id = ?`, [order_id]);
    for (const row of rows) {
      let mutasi = Number(row.quantity || 0);
      const store_id = row.store_id;
      const product_id = row.product_id;
      const [dtls]: any = await pool.query(`SELECT * FROM sw_product_to_store_dtl WHERE store_id = ? AND product_id = ? AND sisa > 0 ORDER BY product_to_store_dtl_id ASC`, [store_id, product_id]);
      for (const d of dtls) {
        if (mutasi <= 0) break;
        let sisa = d.sisa;
        let mutasi1 = 0;
        if (sisa > 0) {
          if (sisa - mutasi > 0) {
            sisa = sisa - mutasi;
            mutasi1 = mutasi;
            mutasi = 0;
          } else {
            mutasi = mutasi - sisa;
            mutasi1 = d.sisa;
            sisa = 0;
          }
          const newMutasi = d.mutasi + mutasi1;
          await pool.query('UPDATE sw_product_to_store_dtl SET ? WHERE product_to_store_dtl_id = ?', [{ mutasi: newMutasi, sisa }, d.product_to_store_dtl_id]);
        }
      }
    }
    return successResponse(res, {}, 'Mutasi stok processed');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};