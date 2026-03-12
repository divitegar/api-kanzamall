import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

// Extend Request to include user from JWT if needed
interface AuthRequest extends Request {
  user?: {
    id?: number;
    type?: string;
    [key: string]: any;
  };
}

// Helper to cast param to number or undefined
const toNum = (v: any) => {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

export const getAddress = async (req: AuthRequest, res: Response) => {
  const customer_id = toNum(req.query.customer_id || req.params.customer_id);
  const address_id = toNum(req.query.address_id || req.params.address_id);

  if (!customer_id) return errorResponse(res, 'customer_id is required', 400);

  try {
    const select = `
      SELECT a.*, c.name as country_name, z.name as zone_name, ci.name as city_name,
             d.name as districts_name, cd.subdistrict_name, cd.tariff_code,
             IFNULL(s.code_origin,'DPK10000') as code_origin, s.store_id, s.name as store_name,
             mw.mst_wilayah_id, mw.urut_jarak
      FROM sw_address a
      LEFT JOIN sw_country c ON a.country_id = c.country_id
      LEFT JOIN sw_zone z ON a.zone_id = z.zone_id AND a.country_id = z.country_id
      LEFT JOIN sw_city ci ON a.city_id = ci.city_id AND a.zone_id = ci.zone_id AND a.country_id = ci.country_id
      LEFT JOIN sw_districts d ON a.districts_id = d.districts_id AND a.city_id = d.city_id AND a.zone_id = d.zone_id AND a.country_id = d.country_id
      LEFT JOIN sw_code_dest cd ON cd.zip_code = a.postcode AND cd.code_dest_id = a.code_dest_id
      LEFT JOIN sw_dtl_wilayah dw ON a.city_id = dw.city_id AND dw.trash = 0
      LEFT JOIN sw_mst_wilayah mw ON mw.mst_wilayah_id = dw.mst_wilayah_id AND mw.status = 1 AND mw.trash = 0
      LEFT JOIN sw_store s ON s.mst_wilayah_id = dw.mst_wilayah_id AND s.status = 1 AND s.trash = 0
    `;

    let where = 'a.customer_id = ?';
    const params: any[] = [customer_id];
    if (address_id) {
      where += ' AND a.address_id = ?';
      params.push(address_id);
    }

    const query = `${select} WHERE ${where} ORDER BY a.default DESC`;
    const [rows] = await pool.query(query, params);
    return successResponse(res, { addresses: rows }, 'Addresses retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getAddressWilayah = async (req: Request, res: Response) => {
  const city_id = toNum(req.query.city_id || req.params.city_id);
  if (!city_id) return errorResponse(res, 'city_id is required', 400);

  try {
    const query = `
      SELECT dw.mst_wilayah_id, s.code_origin
      FROM sw_dtl_wilayah dw
      LEFT JOIN sw_store s ON s.mst_wilayah_id = dw.mst_wilayah_id
      WHERE dw.city_id = ? AND dw.trash = 0
    `;
    const [rows] = await pool.query(query, [city_id]);
    return successResponse(res, { wilayah: rows }, 'Wilayah retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const saveAddress = async (req: AuthRequest, res: Response) => {
  const data = req.body;
  if (!data || !data.customer_id) return errorResponse(res, 'customer_id is required in body', 400);

  try {
    const [result]: any = await pool.query('INSERT INTO sw_address SET ?', [data]);
    return successResponse(res, { insertId: result.insertId }, 'Address saved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
  const id = toNum(req.params.id || req.body.address_id);
  const data = req.body;
  if (!id) return errorResponse(res, 'address_id is required', 400);

  try {
    const [result]: any = await pool.query('UPDATE sw_address SET ? WHERE address_id = ?', [data, id]);
    return successResponse(res, { affectedRows: result.affectedRows }, 'Address updated successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const updateAddressDefault = async (req: AuthRequest, res: Response) => {
  const customer_id = toNum(req.params.customer_id || req.body.customer_id);
  const data = req.body;
  if (!customer_id) return errorResponse(res, 'customer_id is required', 400);

  try {
    const [result]: any = await pool.query('UPDATE sw_address SET ? WHERE customer_id = ?', [data, customer_id]);
    return successResponse(res, { affectedRows: result.affectedRows }, 'Default address updated successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
  const id = toNum(req.params.id || req.body.address_id);
  if (!id) return errorResponse(res, 'address_id is required', 400);

  try {
    const [result]: any = await pool.query('DELETE FROM sw_address WHERE address_id = ?', [id]);
    return successResponse(res, { affectedRows: result.affectedRows }, 'Address deleted successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

// Kodepos
export const getKodepos = async (req: Request, res: Response) => {
  const code_dest_id = toNum(req.query.code_dest_id || req.params.code_dest_id);
  try {
    let query = `SELECT * FROM sw_code_dest WHERE trash = '0' AND status = '1'`;
    const params: any[] = [];
    if (code_dest_id) {
      query += ' AND code_dest_id = ?';
      params.push(code_dest_id);
    }
    query += ' ORDER BY code_dest_id ASC, subdistrict_name ASC';
    const [rows] = await pool.query(query, params);
    return successResponse(res, { kodepos: rows }, 'Kodepos retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getKelurahan = async (req: Request, res: Response) => {
  const district_id = toNum(req.query.district_id || req.params.district_id);
  try {
    let query = `SELECT * FROM sw_code_dest WHERE trash = '0' AND status = '1'`;
    const params: any[] = [];
    if (district_id) {
      query += ' AND districts_id = ?';
      params.push(district_id);
    }
    query += ' ORDER BY code_dest_id ASC, subdistrict_name ASC';
    const [rows] = await pool.query(query, params);
    return successResponse(res, { kelurahan: rows }, 'Kelurahan retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getKecamatan = async (req: Request, res: Response) => {
  const city_id = toNum(req.query.city_id || req.params.city_id);
  try {
    let query = `SELECT * FROM sw_districts WHERE trash = '0' AND status = '1'`;
    const params: any[] = [];
    if (city_id) {
      query += ' AND city_id = ?';
      params.push(city_id);
    }
    query += ' ORDER BY districts_id ASC, name ASC';
    const [rows] = await pool.query(query, params);
    return successResponse(res, { kecamatan: rows }, 'Kecamatan retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getKota = async (req: Request, res: Response) => {
  const zone_id = toNum(req.query.zone_id || req.params.zone_id);
  try {
    let query = `SELECT * FROM sw_city WHERE trash = '0' AND status = '1'`;
    const params: any[] = [];
    if (zone_id) {
      query += ' AND zone_id = ?';
      params.push(zone_id);
    }
    query += ' ORDER BY city_id ASC, name ASC';
    const [rows] = await pool.query(query, params);
    return successResponse(res, { kota: rows }, 'Kota retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getPropinsi = async (req: Request, res: Response) => {
  const country_id = toNum(req.query.country_id || req.params.country_id);
  const zone_id = toNum(req.query.zone_id || req.params.zone_id);
  try {
    let query = `SELECT * FROM sw_zone WHERE trash = '0' AND status = '1'`;
    const params: any[] = [];
    if (zone_id) {
      query = `SELECT * FROM sw_zone WHERE zone_id = ? AND country_id = ? AND trash = '0' AND status = '1'`;
      params.push(zone_id, country_id);
    } else if (country_id) {
      query += ' AND country_id = ?';
      params.push(country_id);
    }
    query += ' ORDER BY country_id ASC, name ASC';
    const [rows] = await pool.query(query, params);
    return successResponse(res, { propinsi: rows }, 'Propinsi retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getCountry = async (req: Request, res: Response) => {
  const country_id = toNum(req.query.country_id || req.params.country_id);
  try {
    let query = `SELECT * FROM sw_country WHERE trash = '0' AND status = '1'`;
    const params: any[] = [];
    if (country_id) {
      query += ' AND country_id = ?';
      params.push(country_id);
    }
    query += ' ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    return successResponse(res, { countries: rows }, 'Countries retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};