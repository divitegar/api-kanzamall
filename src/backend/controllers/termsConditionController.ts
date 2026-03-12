import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getTerms = async (req: Request, res: Response) => {
  const terms_id = req.query.terms_id || req.params['id'];
  try {
    if (!terms_id) {
      const [rows]: any = await pool.query('SELECT * FROM sw_terms_condition WHERE status = 1');
      return successResponse(res, { terms: rows });
    } else {
      const [rows]: any = await pool.query('SELECT * FROM sw_terms_condition WHERE terms_id = ? AND status = 1', [terms_id]);
      return successResponse(res, { term: rows[0] || null });
    }
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export default {
  getTerms
};