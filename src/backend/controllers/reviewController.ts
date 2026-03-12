import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getReviews = async (req: Request, res: Response) => {
  const product_id = req.params.product_id ?? req.query.product_id;
  const batas = req.query.batas ? Number(req.query.batas) : 15;
  if (!product_id) return errorResponse(res, 'product_id required', 400);
  try {
    const q = `SELECT r.*, c.firstname as nama_cust, c.image FROM sw_review r
               LEFT JOIN sw_customer c ON c.customer_id = r.customer_id
               WHERE r.status = 1 AND r.product_id = ? LIMIT ?`;
    const [rows] = await pool.query(q, [Number(product_id), batas]);
    return successResponse(res, { reviews: rows }, 'Reviews retrieved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getCustomerReviews = async (req: Request, res: Response) => {
  const customer_id = req.params.customer_id ?? req.query.customer_id;
  const batas = req.query.batas ? Number(req.query.batas) : 15;
  if (!customer_id) return errorResponse(res, 'customer_id required', 400);
  try {
    const q = `SELECT r.*, c.firstname as nama_cust, pdd.name, p.sku, p.image FROM sw_review r
               LEFT JOIN sw_product p ON p.product_id = r.product_id
               LEFT JOIN sw_product_description pdd ON pdd.product_id = r.product_id AND pdd.language_id = 1
               LEFT JOIN sw_customer c ON c.customer_id = r.customer_id
               WHERE r.status = 1 AND r.customer_id = ? LIMIT ?`;
    const [rows] = await pool.query(q, [Number(customer_id), batas]);
    return successResponse(res, { reviews: rows }, 'Customer reviews retrieved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const saveReview = async (req: Request, res: Response) => {
  const data = req.body;
  if (!data) return errorResponse(res, 'body required', 400);
  try {
    const [result]: any = await pool.query('INSERT INTO sw_review SET ?', [data]);
    return successResponse(res, { insertId: result.insertId }, 'Review saved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};
