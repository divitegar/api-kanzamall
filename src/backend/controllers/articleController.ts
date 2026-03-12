import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

// GET /api/articles or /api/articles?artikel_id=123 or /api/articles/:artikel_id
export const getArticles = async (req: Request, res: Response) => {
  const artikelIdParam = req.params.artikel_id ?? req.query.artikel_id;
  const artikel_id = artikelIdParam !== undefined ? Number(artikelIdParam) : undefined;

  try {
    let query = `
      SELECT c.title as category_name, a.*
      FROM sw_artikel a
      LEFT JOIN sw_artikel_category c ON c.artikel_category_id = a.artikel_category_id
    `;

    const whereClauses: string[] = ['a.published = 1'];
    const params: any[] = [];

    if (artikel_id !== undefined && !Number.isNaN(artikel_id)) {
      whereClauses.push('a.artikel_id = ?');
      params.push(artikel_id);
    }

    query += ' WHERE ' + whereClauses.join(' AND ');
    query += ' ORDER BY a.artikel_id DESC';

    const [rows] = await pool.query(query, params);
    return successResponse(res, { articles: rows }, 'Articles retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

// Optional: helper to get single article by id (convenience)
export const getArticleById = async (req: Request, res: Response) => {
  req.params.artikel_id = req.params.artikel_id ?? req.query.artikel_id;
  return getArticles(req, res);
};