import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
export const getProducts = async (req, res) => {
    const { product_id, category_id, jenis, limit = 8 } = req.query;
    try {
        // Detail access: bump product view counter when product_id is explicitly requested.
        if (product_id) {
            await pool.query(`UPDATE sw_product
         SET viewed = COALESCE(viewed, 0) + 1
         WHERE product_id = ? AND status = 1 AND trash = 0`, [product_id]);
        }
        let query = `
      SELECT 
        pd.name, pd.description, pd.tag, pd.meta_title, pd.meta_description, pd.meta_keyword,
        ss.name as stock_status,
        m.name as brand,
        wcd.title as berat,
        cd.name as category_name,
        COALESCE(sales.total_qty, 0) as total_qty,
        (p.weight / wc.value) as nilai_berat,
        p.*
      FROM sw_product p
      LEFT JOIN sw_product_description pd ON pd.product_id = p.product_id
      LEFT JOIN sw_stock_status ss ON ss.stock_status_id = p.stock_status_id
      LEFT JOIN sw_manufacturer m ON m.manufacturer_id = p.manufacturer_id
      LEFT JOIN sw_weight_class_description wcd ON wcd.weight_class_id = p.weight_class_id
      LEFT JOIN sw_weight_class wc ON wc.weight_class_id = p.weight_class_id
      LEFT JOIN sw_category_description cd ON cd.category_id = p.category_id
      LEFT JOIN (
        SELECT op.product_id, SUM(op.quantity) AS total_qty
        FROM sw_order_product op
        JOIN sw_order o ON o.order_id = op.order_id
        JOIN sw_product p2 ON p2.product_id = op.product_id
        WHERE o.order_status_id = 7 AND p2.status = 1 AND p2.trash = 0
        GROUP BY op.product_id
      ) sales ON sales.product_id = p.product_id
    `;
        let whereClauses = ["p.trash = '0'", "p.status = 1"];
        let params = [];
        if (product_id) {
            whereClauses.push("p.product_id = ?");
            params.push(product_id);
        }
        if (category_id) {
            whereClauses.push("p.category_id = ?");
            params.push(category_id);
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
    }
    catch (error) {
        return errorResponse(res, error.message, 500);
    }
};
export const getProductsByCategory = async (req, res) => {
    const { category_id } = req.params;
    try {
        let query = `
      SELECT pd.name, p.*
      FROM sw_product p
      LEFT JOIN sw_product_description pd ON pd.product_id = p.product_id
    `;
        let whereClauses = ["p.trash = '0'", "p.status = 1"];
        let params = [];
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
    }
    catch (error) {
        return errorResponse(res, error.message, 500);
    }
};
export const getProductDeals = async (req, res) => {
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
    }
    catch (error) {
        return errorResponse(res, error.message, 500);
    }
};
export const searchProducts = async (req, res) => {
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
        let params = [];
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
    }
    catch (error) {
        return errorResponse(res, error.message, 500);
    }
};
export const getBestSellingProducts = async (req, res) => {
    const limit = Number(req.query.limit) || 10;
    try {
        // Aggregate top product ids from completed orders (order_status_id = 7)
        // but only consider products that are active (status = 1 and trash = 0)
        const topQuery = `
      SELECT op.product_id, SUM(op.quantity) AS total_qty
      FROM sw_order_product op
      JOIN sw_order o ON o.order_id = op.order_id
      JOIN sw_product p ON p.product_id = op.product_id
      WHERE o.order_status_id = 7 AND p.status = 1 AND p.trash = 0
      GROUP BY op.product_id
      ORDER BY total_qty DESC
      LIMIT ?
    `;
        const [topRows] = await pool.query(topQuery, [limit]);
        if (!topRows || topRows.length === 0) {
            return successResponse(res, { products: [] }, 'Best selling products retrieved successfully');
        }
        const productIds = topRows.map((r) => Number(r.product_id));
        const placeholders = productIds.map(() => '?').join(',');
        // Fetch product details for these product IDs, only active (trash=0,status=1)
        const query = `
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
      WHERE p.product_id IN (${placeholders})
        AND p.trash = '0' AND p.status = 1
      ORDER BY FIELD(p.product_id, ${placeholders})
    `;
        const params = [...productIds, ...productIds];
        const [rows] = await pool.query(query, params);
        // Map total_qty by product_id
        const qtyMap = new Map();
        topRows.forEach((r) => qtyMap.set(Number(r.product_id), Number(r.total_qty)));
        // Normalize image and attach total_qty
        const host = req.get('host') || 'localhost:3000';
        const protocol = req.protocol || 'http';
        const baseUrl = `${protocol}://${host}`;
        const normalizeImage = (img) => {
            if (!img)
                return null;
            if (img.startsWith('http://') || img.startsWith('https://'))
                return img;
            const filename = img.replace(/^\/+/, '');
            return `${baseUrl}/images/${encodeURI(filename)}`;
        };
        const products = (rows || []).map((p) => ({
            ...p,
            total_qty: qtyMap.get(Number(p.product_id)) || 0,
            image_url: normalizeImage(p.image)
        }));
        return successResponse(res, { products }, 'Best selling products retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, error.message, 500);
    }
};
