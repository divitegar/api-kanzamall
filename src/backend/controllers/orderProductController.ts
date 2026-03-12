import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getOrderProduk = async (req: Request, res: Response) => {
  const order_id = req.query.order_id ?? req.params.order_id;
  try {
    let q = `SELECT op.*, p.sku, p.image, o.invoice_no, o.date_added as tanggal FROM sw_order_product op
               LEFT JOIN sw_product p ON p.product_id = op.product_id
               LEFT JOIN sw_order o ON o.order_id = op.order_id`;
    const params: any[] = [];
    if (order_id) {
      q += ' WHERE op.order_id = ?';
      params.push(order_id);
    }
    const [rows] = await pool.query(q, params);
    return successResponse(res, { products: rows }, 'Order products retrieved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getOrderHistory = async (req: Request, res: Response) => {
  const order_id = req.query.order_id ?? req.params.order_id;
  try {
    let q = `SELECT h.*, s.name as status_name FROM sw_order_history h LEFT JOIN sw_order_status s ON h.order_status_id = s.order_status_id`;
    const params: any[] = [];
    if (order_id) {
      q += ' WHERE h.order_id = ?';
      params.push(order_id);
    }
    const [rows] = await pool.query(q, params);
    return successResponse(res, { history: rows }, 'Order history retrieved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};