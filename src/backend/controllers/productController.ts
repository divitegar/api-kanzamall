import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

// Extend Request to include user from JWT
interface AuthRequest extends Request {
  user?: {
    id: number;
    type: string;
    [key: string]: any;
  };
}

export const getProducts = async (req: AuthRequest, res: Response) => {
  const { product_id, category_id, jenis, limit = 8 } = req.query;
  
  try {
    let query = `
      SELECT 
        pd.name, pd.description, pd.tag, pd.meta_title, pd.meta_description, pd.meta_keyword,
        ss.name as stock_status,
        m.name as brand,
        wcd.title as berat,
        cd.name as category_name,
        (p.weight / wc.value) as nilai_berat,
        p.*
      FROM sw_product p
      LEFT JOIN sw_product_description pd ON pd.product_id = p.product_id
      LEFT JOIN sw_stock_status ss ON ss.stock_status_id = p.stock_status_id
      LEFT JOIN sw_manufacturer m ON m.manufacturer_id = p.manufacturer_id
      LEFT JOIN sw_weight_class_description wcd ON wcd.weight_class_id = p.weight_class_id
      LEFT JOIN sw_weight_class wc ON wc.weight_class_id = p.weight_class_id
      LEFT JOIN sw_category_description cd ON cd.category_id = p.category_id
    `;

    let whereClauses = ["p.trash = '0'", "p.status = 1"];
    let params: any[] = [];

    if (jenis === '0') {
      if (product_id) {
        whereClauses.push("p.product_id = ?");
        params.push(product_id);
      }
    } else {
      if (category_id) {
        whereClauses.push("p.category_id = ?");
        params.push(category_id);
      }
    }

    // Session logic (type_user = 0 means public/regular user in PHP logic provided)
    // If not logged in or type_user is 0, show only leader=0 products
    const user = req.user;
    if (!user || user.type !== 'admin') {
       whereClauses.push("p.leader = 0");
    }

    query += " WHERE " + whereClauses.join(" AND ");
    query += " LIMIT ?";
    params.push(Number(limit));

    const [rows] = await pool.query(query, params);
    return successResponse(res, { products: rows }, 'Products retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getProductsByCategory = async (req: AuthRequest, res: Response) => {
  const { category_id } = req.params;
  
  try {
    let query = `
      SELECT pd.name, p.*
      FROM sw_product p
      LEFT JOIN sw_product_description pd ON pd.product_id = p.product_id
    `;

    let whereClauses = ["p.trash = '0'", "p.status = 1"];
    let params: any[] = [];

    if (category_id) {
      whereClauses.push("p.category_id = ?");
      params.push(category_id);
    }

    const user = req.user;
    if (!user || user.type !== 'admin') {
       whereClauses.push("p.leader = 0");
       whereClauses.push("p.dashboard = '0'");
    }

    query += " WHERE " + whereClauses.join(" AND ");

    const [rows] = await pool.query(query, params);
    return successResponse(res, { products: rows }, 'Products by category retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getProductDeals = async (req: Request, res: Response) => {
  const limit = req.query.limit || 4;
  
  try {
    const query = `
      SELECT pd.name, cd.name as category_name, p.*
      FROM sw_product p
      LEFT JOIN sw_product_description pd ON pd.product_id = p.product_id
      LEFT JOIN sw_category_description cd ON cd.category_id = p.category_id
      WHERE p.trash = '0' AND p.status = 1 AND p.deal = '1' AND p.dashboard = '0'
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [Number(limit)]);
    return successResponse(res, { products: rows }, 'Product deals retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const searchProducts = async (req: AuthRequest, res: Response) => {
  const { q, category_id = 0, limit = 20 } = req.query;
  
  try {
    let query = `
      SELECT 
        pd.name, pd.description, pd.tag, pd.meta_title, pd.meta_description, pd.meta_keyword,
        ss.name as stock_status,
        m.name as brand,
        wcd.title as berat,
        cd.name as category_name,
        (p.weight / wc.value) as nilai_berat,
        p.*
      FROM sw_product p
      LEFT JOIN sw_product_description pd ON pd.product_id = p.product_id
      LEFT JOIN sw_stock_status ss ON ss.stock_status_id = p.stock_status_id
      LEFT JOIN sw_manufacturer m ON m.manufacturer_id = p.manufacturer_id
      LEFT JOIN sw_weight_class_description wcd ON wcd.weight_class_id = p.weight_class_id
      LEFT JOIN sw_weight_class wc ON wc.weight_class_id = p.weight_class_id
      LEFT JOIN sw_category_description cd ON cd.category_id = p.category_id
    `;

    let whereClauses = ["p.trash = '0'", "p.status = 1"];
    let params: any[] = [];

    if (q) {
      whereClauses.push("pd.name LIKE ?");
      params.push(`%${q}%`);
    }

    if (Number(category_id) !== 0) {
      whereClauses.push("p.category_id = ?");
      params.push(category_id);
    }

    const user = req.user;
    if (!user || user.type !== 'admin') {
       whereClauses.push("p.leader = 0");
       whereClauses.push("p.dashboard = '0'");
    }

    query += " WHERE " + whereClauses.join(" AND ");
    query += " LIMIT ?";
    params.push(Number(limit));

    const [rows] = await pool.query(query, params);
    return successResponse(res, { products: rows }, 'Search results retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const getBestSellingProducts = async (req: AuthRequest, res: Response) => {
  const limit = Number(req.query.limit) || 10;

  try {
    // First, aggregate top product ids from completed orders (order_status_id = 7)
    const topQuery = `
      SELECT op.product_id, SUM(op.quantity) AS total_qty
      FROM sw_order_product op
      JOIN sw_order o ON o.order_id = op.order_id AND o.order_status_id = 7
      GROUP BY op.product_id
      ORDER BY total_qty DESC
      LIMIT ?
    `;

    const [topRows]: any = await pool.query(topQuery, [limit]);
    if (!topRows || topRows.length === 0) {
      return successResponse(res, { products: [] }, 'Best selling products retrieved successfully');
    }

    // Use the aggregated list as a derived table to join product details
    const query = `
      SELECT 
        pd.name, pd.description, pd.tag, pd.meta_title, pd.meta_description, pd.meta_keyword,
        ss.name as stock_status,
        m.name as brand,
        wcd.title as berat,
        cd.name as category_name,
        (p.weight / wc.value) as nilai_berat,
        p.*,
        tp.total_qty
      FROM (
        SELECT op.product_id, SUM(op.quantity) AS total_qty
        FROM sw_order_product op
        JOIN sw_order o ON o.order_id = op.order_id AND o.order_status_id = 7
        GROUP BY op.product_id
        ORDER BY total_qty DESC
        LIMIT ?
      ) tp
      JOIN sw_product p ON p.product_id = tp.product_id
      LEFT JOIN sw_product_description pd ON pd.product_id = p.product_id
      LEFT JOIN sw_stock_status ss ON ss.stock_status_id = p.stock_status_id
      LEFT JOIN sw_manufacturer m ON m.manufacturer_id = p.manufacturer_id
      LEFT JOIN sw_weight_class_description wcd ON wcd.weight_class_id = p.weight_class_id
      LEFT JOIN sw_weight_class wc ON wc.weight_class_id = p.weight_class_id
      LEFT JOIN sw_category_description cd ON cd.category_id = p.category_id
      WHERE p.trash = '0' AND p.status = 1
      ORDER BY tp.total_qty DESC
    `;

    const [rows]: any = await pool.query(query, [limit]);
    return successResponse(res, { products: rows }, 'Best selling products retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};
