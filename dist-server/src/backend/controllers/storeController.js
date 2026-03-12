import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
export const getStores = async (req, res) => {
    try {
        const query = `
      SELECT 
        mw.name as wilayah,
        IF(s.jenis = 0, 'Cabang', 'Pusat') as jenis_toko,
        s.*
      FROM sw_store s
      LEFT JOIN sw_mst_wilayah mw ON mw.mst_wilayah_id = s.mst_wilayah_id
      WHERE s.jenis = 1 AND s.trash = 0
    `;
        const [rows] = await pool.query(query);
        return successResponse(res, { stores: rows }, 'Stores retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, error.message, 500);
    }
};
export const checkWilayah = async (req, res) => {
    const { city_id } = req.query;
    if (!city_id) {
        return errorResponse(res, 'city_id is required');
    }
    try {
        const query = `
      SELECT 
        s.store_id,
        s.name as store_name,
        dw.*
      FROM sw_dtl_wilayah dw
      LEFT JOIN sw_store s ON dw.mst_wilayah_id = s.mst_wilayah_id
      WHERE dw.jenis = 1 AND dw.trash = 0 AND dw.city_id = ?
    `;
        const [rows] = await pool.query(query, [city_id]);
        return successResponse(res, { wilayah: rows }, 'Wilayah checked successfully');
    }
    catch (error) {
        return errorResponse(res, error.message, 500);
    }
};
export const changeStore = async (req, res) => {
    try {
        const query = `
      SELECT 
        mw.name as wilayah,
        IF(s.jenis = 0, 'Cabang', 'Pusat') as jenis_toko,
        s.*
      FROM sw_store s
      LEFT JOIN sw_mst_wilayah mw ON mw.mst_wilayah_id = s.mst_wilayah_id
      WHERE s.status = 1 AND s.trash = 0
    `;
        const [rows] = await pool.query(query);
        return successResponse(res, { stores: rows }, 'Available stores retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, error.message, 500);
    }
};
export const findStore = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
      SELECT 
        mw.name as wilayah,
        IF(s.jenis = 0, 'Cabang', 'Pusat') as jenis_toko,
        s.*
      FROM sw_store s
      LEFT JOIN sw_mst_wilayah mw ON mw.mst_wilayah_id = s.mst_wilayah_id
      WHERE s.store_id = ? AND s.status = 1 AND s.trash = 0
    `;
        const [rows] = await pool.query(query, [id]);
        if (rows.length === 0) {
            return errorResponse(res, 'Store not found', 404);
        }
        return successResponse(res, { store: rows[0] }, 'Store found successfully');
    }
    catch (error) {
        return errorResponse(res, error.message, 500);
    }
};
