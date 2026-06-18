import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getCategories = async (req: Request, res: Response) => {
  const categoryIdParam = req.params.category_id ?? req.query.category_id;
  const category_id = categoryIdParam !== undefined ? Number(categoryIdParam) : undefined;

  try {
    let query = `
      SELECT COALESCE(cd_primary.name, cd_any.name) AS name, c.*, COALESCE(pc.active_product_count, 0) AS active_product_count
      FROM sw_category c
      LEFT JOIN sw_category_description cd_primary
        ON cd_primary.category_id = c.category_id AND cd_primary.language_id = 1
      LEFT JOIN (
        SELECT category_id, MIN(name) AS name
        FROM sw_category_description
        GROUP BY category_id
      ) cd_any ON cd_any.category_id = c.category_id
      LEFT JOIN (
        SELECT p.category_id, COUNT(*) AS active_product_count
        FROM sw_product p
        WHERE p.status = 1 AND p.trash = '0'
        GROUP BY p.category_id
      ) pc ON pc.category_id = c.category_id
    `;

    const whereClauses: string[] = ["c.trash = '0'", "c.status = '1'"];
    const params: any[] = [];

    if (category_id !== undefined && !Number.isNaN(category_id)) {
      whereClauses.push('c.category_id = ?');
      params.push(category_id);
    }

    query += ' WHERE ' + whereClauses.join(' AND ');
    query += ' ORDER BY c.sort_order ASC';

    const [rows] = await pool.query(query, params);
    return successResponse(res, { categories: rows }, 'Categories retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getCategoryDescription = async (req: Request, res: Response) => {
  const categoryIdParam = req.params.category_id ?? req.query.category_id;
  const category_id = categoryIdParam !== undefined ? Number(categoryIdParam) : undefined;
  const languageIdParam = req.query.language_id;
  const language_id = languageIdParam !== undefined ? Number(languageIdParam) : 1;

  try {
    let query = `
      SELECT
        COALESCE(cd_primary.name, cd_fallback.name) AS name,
        COALESCE(cd_primary.description, cd_fallback.description) AS description,
        COALESCE(cd_primary.meta_title, cd_fallback.meta_title) AS meta_title,
        COALESCE(cd_primary.meta_description, cd_fallback.meta_description) AS meta_description,
        COALESCE(cd_primary.meta_keyword, cd_fallback.meta_keyword) AS meta_keyword,
        c.*
      FROM sw_category c
      LEFT JOIN sw_category_description cd_primary
        ON cd_primary.category_id = c.category_id AND cd_primary.language_id = ?
      LEFT JOIN sw_category_description cd_fallback
        ON cd_fallback.category_id = c.category_id
        AND cd_fallback.language_id = (
          SELECT MIN(cd2.language_id)
          FROM sw_category_description cd2
          WHERE cd2.category_id = c.category_id
        )
    `;

    const whereClauses: string[] = ["c.trash = '0'"];
    const params: any[] = [Number.isNaN(language_id) ? 1 : language_id];

    if (category_id !== undefined && !Number.isNaN(category_id)) {
      whereClauses.push('c.category_id = ?');
      params.push(category_id);
    }

    query += ' WHERE ' + whereClauses.join(' AND ');
  query += ' ORDER BY COALESCE(cd_primary.name, cd_fallback.name) ASC';

    const [rows] = await pool.query(query, params);
    return successResponse(res, { categories: rows }, 'Category descriptions retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};
