import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getPrivacy = async (req: Request, res: Response) => {
  const id = req.params.privacy_policy_id ?? req.query.privacy_policy_id;
  try {
    let query = `SELECT * FROM sw_privacy_policy WHERE status = 1`;
    const params: any[] = [];
    if (id) {
      query += ' AND privacy_policy_id = ?';
      params.push(Number(id));
    }
    const [rows] = await pool.query(query, params);
    return successResponse(res, { privacy: rows }, 'Privacy policy retrieved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};