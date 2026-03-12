import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getCategories = async (req: Request, res: Response) => {
  const categoryIdParam = req.params.category_id ?? req.query.category_id;
  const category_id = categoryIdParam !== undefined ? Number(categoryIdParam) : undefined;

  try {
    let query = `
      SELECT cd.name, c.*
      FROM sw_category c
      LEFT JOIN sw_category_description cd ON cd.category_id = c.category_id AND cd.language_id = 1
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

  try {
    let query = `
      SELECT cd.name, cd.description, cd.meta_title, cd.meta_description, cd.meta_keyword, c.*
      FROM sw_category c
      LEFT JOIN sw_category_description cd ON cd.category_id = c.category_id AND cd.language_id = 1
    `;

    const whereClauses: string[] = ["c.trash = '0'"];
    const params: any[] = [];

    if (category_id !== undefined && !Number.isNaN(category_id)) {
      whereClauses.push('c.category_id = ?');
      params.push(category_id);
    }

    query += ' WHERE ' + whereClauses.join(' AND ');
    query += ' ORDER BY cd.name ASC';

    const [rows] = await pool.query(query, params);
    return successResponse(res, { categories: rows }, 'Category descriptions retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};
