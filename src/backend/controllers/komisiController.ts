import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

const toStr = (v: any) => v === undefined || v === null ? undefined : String(v);

export const searchKomisi = async (req: Request, res: Response) => {
  const { bulan1, tahun1, bulan2, tahun2, id, type_user } = req.query;
  const params: any = { bulan1: toStr(bulan1), tahun1: toStr(tahun1), bulan2: toStr(bulan2), tahun2: toStr(tahun2), id: toStr(id), type_user: toStr(type_user) };

  try {
    if (params.bulan1 || params.tahun1) {
      const q = `
        SELECT k.user_id, k.tanggal, k.name, k.type_user,
               SUM(k.nilai_order) as nilai_order, SUM(k.nilai_komisi) as nilai_komisi,
               k.tanggal_bayar, o.invoice_no
        FROM sw_komisi k
        LEFT JOIN sw_order o ON o.order_id = k.order_id
        WHERE k.customer_id = ?
          AND DATE_FORMAT(k.tanggal, '%Y%m') >= ?
          AND DATE_FORMAT(k.tanggal, '%Y%m') <= ?
        GROUP BY k.user_id, DATE_FORMAT(DATE(k.tanggal), '%Y%m')
      `;
      const periode1 = `${params.tahun1}${params.bulan1}`;
      const periode2 = `${params.tahun2}${params.bulan2}`;
      const [rows] = await pool.query(q, [params.id, periode1, periode2]);
      return successResponse(res, { result: rows }, 'Komisi summary');
    }

    // fallback: simple filter by id and type_user
    let q2 = `SELECT * FROM sw_komisi WHERE 1=1`;
    const qParams: any[] = [];
    if (params.id) {
      q2 += ' AND customer_id = ?';
      qParams.push(params.id);
    }
    if (params.type_user) {
      q2 += ' AND type_user = ?';
      qParams.push(params.type_user);
    }
    const [rows2] = await pool.query(q2, qParams);
    return successResponse(res, { result: rows2 }, 'Komisi results');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getKomisiSummary = async (req: Request, res: Response) => {
  const bulan = toStr(req.query.bulan);
  const tahun = toStr(req.query.tahun);

  try {
    if (!bulan && !tahun) {
      const q = `
        SELECT k.user_id, k.tanggal, k.name, k.type_user,
               SUM(k.nilai_order) as nilai_order, SUM(k.nilai_komisi) as nilai_komisi,
               k.tanggal_bayar, o.invoice_no
        FROM sw_komisi k
        LEFT JOIN sw_order o ON o.order_id = k.order_id
        GROUP BY k.user_id, DATE_FORMAT(DATE(k.tanggal), '%Y%m')
        WHERE k.tanggal = DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
      `;
      const [rows] = await pool.query(q);
      return successResponse(res, { result: rows }, 'Komisi summary');
    }

    // other filters
    let q2 = `SELECT * FROM sw_komisi WHERE 1=1`;
    const params: any[] = [];
    if (tahun) {
      q2 += " AND DATE_FORMAT(tanggal, '%Y') = ?";
      params.push(tahun);
    }
    if (bulan) {
      q2 += " AND DATE_FORMAT(tanggal, '%m') = ?";
      params.push(bulan);
    }
    const [rows2] = await pool.query(q2, params);
    return successResponse(res, { result: rows2 }, 'Komisi filtered');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};