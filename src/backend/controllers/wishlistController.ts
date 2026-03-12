import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getWishlist = async (req: Request, res: Response) => {
  const customer_id = req.query.customer_id || req.params['customer_id'];
  const batas = Number(req.query.batas || 10);
  if (!customer_id) return errorResponse(res, 'customer_id is required');

  try {
    const query = `
      SELECT cw.customer_id, cw.product_id, pd.name, pd.description, pd.tag, pd.meta_title,
             pd.meta_description, pd.meta_keyword, ss.name as stock_status, m.name as brand,
             wcd.title as berat, cd.name as category_name,
             (p.weight / wc.value) as nilai_berat, p.*
      FROM sw_customer_wishlist cw
      LEFT JOIN sw_product p ON p.product_id = cw.product_id
      LEFT JOIN sw_product_description pd ON pd.product_id = cw.product_id
      LEFT JOIN sw_stock_status ss ON ss.stock_status_id = p.stock_status_id
      LEFT JOIN sw_manufacturer m ON m.manufacturer_id = p.manufacturer_id
      LEFT JOIN sw_weight_class_description wcd ON wcd.weight_class_id = p.weight_class_id
      LEFT JOIN sw_weight_class wc ON wc.weight_class_id = p.weight_class_id
      LEFT JOIN sw_category_description cd ON cd.category_id = p.category_id
      WHERE p.trash = '0' AND p.status = 1 AND cw.customer_id = ?
      LIMIT ?
    `;

    const [rows]: any = await pool.query(query, [customer_id, batas]);
    return successResponse(res, { wishlist: rows });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const addWishlist = async (req: Request, res: Response) => {
  const { customer_id, product_id } = req.body;
  if (!customer_id || !product_id) return errorResponse(res, 'customer_id and product_id are required');

  try {
    // Check if already exists
    const [exists]: any = await pool.query('SELECT * FROM sw_customer_wishlist WHERE customer_id = ? AND product_id = ?', [customer_id, product_id]);
    if (Array.isArray(exists) && exists.length > 0) {
      return successResponse(res, { message: 'Already in wishlist' });
    }

    const [result]: any = await pool.query('INSERT INTO sw_customer_wishlist (customer_id, product_id, date_added) VALUES (?, ?, ?)', [customer_id, product_id, new Date()]);
    return successResponse(res, { insertId: result.insertId }, 'Wishlist added', 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const deleteWishlist = async (req: Request, res: Response) => {
  const customer_id = req.params.customer_id || req.body.customer_id;
  const product_id = req.params.product_id || req.body.product_id;
  if (!customer_id || !product_id) return errorResponse(res, 'customer_id and product_id are required');

  try {
    const [result]: any = await pool.query('DELETE FROM sw_customer_wishlist WHERE customer_id = ? AND product_id = ?', [customer_id, product_id]);
    return successResponse(res, { affectedRows: result.affectedRows }, 'Wishlist entry removed');
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export default { getWishlist, addWishlist, deleteWishlist };