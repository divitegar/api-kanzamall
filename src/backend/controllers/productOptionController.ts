import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getProductOptions = async (req: Request, res: Response) => {
  const product_id = req.params.product_id ?? req.query.product_id;
  const batas = req.query.batas ? Number(req.query.batas) : 4;
  if (!product_id) return errorResponse(res, 'product_id required', 400);
  try {
    const q = `SELECT * FROM sw_product_option WHERE product_id = ? LIMIT ?`;
    const [rows] = await pool.query(q, [Number(product_id), batas]);
    return successResponse(res, { options: rows }, 'Product options retrieved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};
