import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getAbout = async (req: Request, res: Response) => {
  const language_id = req.query.language_id as string | undefined;

  try {
    let query = `SELECT * FROM sw_about WHERE sw_about.status = '1'`;
    const params: any[] = [];

    if (language_id) {
      query += ' AND sw_about.language_id = ?';
      params.push(Number(language_id));
    }

    const [rows] = await pool.query(query, params);
    return successResponse(res, { about: rows }, 'About us retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};
