import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getStores = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT mw.name as wilayah, IF(s.jenis = 0, 'Cabang', 'Pusat') as jenis_toko, s.*
      FROM sw_store s
      LEFT JOIN sw_mst_wilayah mw ON mw.mst_wilayah_id = s.mst_wilayah_id
      WHERE s.jenis = 1 AND s.trash = 0
    `;
    const [rows]: any = await pool.query(query);
    return successResponse(res, { stores: rows });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const checkWilayah = async (req: Request, res: Response) => {
  const city_id = req.query.city_id as string | undefined;
  if (!city_id) return errorResponse(res, 'city_id is required');

  try {
    const query = `
      SELECT dw.*, s.store_id, s.name as store_name, s.code_origin
      FROM sw_dtl_wilayah dw
      LEFT JOIN sw_store s ON dw.mst_wilayah_id = s.mst_wilayah_id
      WHERE dw.jenis = 1 AND dw.trash = 0 AND dw.city_id = ?
    `;
    const [rows]: any = await pool.query(query, [city_id]);
    return successResponse(res, { wilayah: rows });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const changeStore = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT mw.name as wilayah, IF(s.jenis = 0, 'Cabang', 'Pusat') as jenis_toko, s.*
      FROM sw_store s
      LEFT JOIN sw_mst_wilayah mw ON mw.mst_wilayah_id = s.mst_wilayah_id
      WHERE s.status = 1 AND s.trash = 0
    `;
    const [rows]: any = await pool.query(query);
    return successResponse(res, { stores: rows });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const findStore = async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) return errorResponse(res, 'id is required');

  try {
    const query = `
      SELECT mw.name as wilayah, IF(s.jenis = 0, 'Cabang', 'Pusat') as jenis_toko, s.*
      FROM sw_store s
      LEFT JOIN sw_mst_wilayah mw ON mw.mst_wilayah_id = s.mst_wilayah_id
      WHERE s.store_id = ? AND s.status = 1 AND s.trash = 0
    `;
    const [rows]: any = await pool.query(query, [id]);
    return successResponse(res, { store: rows[0] || null });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export default {
  getStores,
  checkWilayah,
  changeStore,
  findStore
};