import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

const toNum = (v: any) => (v === undefined || v === null) ? undefined : Number(v);
const toStr = (v: any) => (v === undefined || v === null) ? undefined : String(v);

export const getKategoriKonsultasi = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM sw_konsultasi_categori WHERE published = 1 AND hapus = 0`);
    return successResponse(res, { categories: rows }, 'Konsultasi categories');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getJmlKonsultasiKategori = async (req: Request, res: Response) => {
  try {
    const q = `SELECT kc.*, IFNULL(b.jml,0) as jml FROM sw_konsultasi_categori kc
               LEFT JOIN (SELECT kategori_id, COUNT(8) as jml FROM sw_konsultasi WHERE dibaca=0 GROUP BY kategori_id) b
               ON b.kategori_id = kc.kategori_id
               WHERE kc.published = 1 AND kc.hapus = 0`;
    const [rows] = await pool.query(q);
    return successResponse(res, { categories: rows }, 'Konsultasi kategori counts');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getJmlKonsultasiBaru = async (req: Request, res: Response) => {
  const penerima_id = toNum(req.query.penerima_id ?? req.params.penerima_id);
  if (!penerima_id) return errorResponse(res, 'penerima_id required', 400);
  try {
    const [rows]: any = await pool.query('SELECT COUNT(8) as jml FROM sw_konsultasi WHERE dibaca = 0 AND hapus = 0 AND penerima_id = ?', [penerima_id]);
    return successResponse(res, { count: rows && rows[0] ? rows[0].jml : 0 }, 'Jumlah konsultasi baru');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const isKonsultasiOpen = async (req: Request, res: Response) => {
  const user_id = toNum(req.query.user_id ?? req.params.user_id);
  if (!user_id) return errorResponse(res, 'user_id required', 400);
  try {
    const [rows]: any = await pool.query('SELECT * FROM sw_konsultasi WHERE user_id = ? AND status_konsultasi = 0 AND hapus = 0', [user_id]);
    return successResponse(res, { open: rows.length > 0 }, 'Konsultasi open status');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getKonsultasi = async (req: Request, res: Response) => {
  const user_id = toNum(req.query.user_id ?? req.params.user_id);
  try {
    const q = `SELECT k.*, u.firstname, u.lastname, kc.nama_kategori FROM sw_konsultasi k
               LEFT JOIN sw_user u ON u.user_id = k.penerima_id
               LEFT JOIN sw_konsultasi_categori kc ON kc.kategori_id = k.kategori_id
               WHERE k.user_id = ? AND k.hapus = 0 ORDER BY k.tanggal_update DESC`;
    const [rows] = await pool.query(q, [user_id]);
    return successResponse(res, { konsultasi: rows }, 'Konsultasi retrieved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getJmlAntrian = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query("SELECT COUNT(8) as jml FROM sw_konsultasi WHERE dibaca = 0 AND penerima_id = 0 AND hapus = 0");
    return successResponse(res, { count: rows && rows[0] ? rows[0].jml : 0 }, 'Jumlah antrian');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getAntrian = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query("SELECT * FROM sw_konsultasi WHERE dibaca = 0 AND penerima_id = 0 AND hapus = 0 ORDER BY tanggal DESC");
    return successResponse(res, { antrian: rows }, 'Antrian retrieved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const jawabAntrian = async (req: Request, res: Response) => {
  const id = toNum(req.params.id || req.body.konsul_id);
  const data = req.body;
  if (!id) return errorResponse(res, 'konsul_id required', 400);
  try {
    await pool.query('UPDATE sw_konsultasi SET ? WHERE konsul_id = ?', [data, id]);
    await pool.query('UPDATE sw_konsultasi_dtl SET ? WHERE konsul_id = ?', [data, id]);
    return successResponse(res, {}, 'Answered antrian');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getDataKonsul = async (req: Request, res: Response) => {
  const konsul_id = toNum(req.query.konsul_id ?? req.params.konsul_id);
  try {
    const q = `SELECT k.*, c.firstname, kc.nama_kategori FROM sw_konsultasi k
               LEFT JOIN sw_customer c ON c.customer_id = k.penerima_id
               LEFT JOIN sw_konsultasi_categori kc ON kc.kategori_id = k.kategori_id
               WHERE k.konsul_id = ? AND k.hapus = 0`;
    const [rows] = await pool.query(q, [konsul_id]);
    return successResponse(res, { data: rows }, 'Konsul data');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getChatKonsul = async (req: Request, res: Response) => {
  const id = toNum(req.query.id ?? req.params.id);
  try {
    const q = `SELECT d.*, c.firstname FROM sw_konsultasi_dtl d
               LEFT JOIN sw_customer c ON c.customer_id = d.user_id
               WHERE d.konsul_id = ? AND d.hapus = 0 ORDER BY d.tanggal ASC`;
    const [rows] = await pool.query(q, [id]);
    return successResponse(res, { chat: rows }, 'Chat messages');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const insertKonsul = async (req: Request, res: Response) => {
  const data = req.body;
  if (!data) return errorResponse(res, 'body required', 400);
  try {
    const [result]: any = await pool.query('INSERT INTO sw_konsultasi SET ?', [data]);
    return successResponse(res, { insertId: result.insertId }, 'Konsul inserted');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const updateKonsul = async (req: Request, res: Response) => {
  const id = toNum(req.params.konsul_id || req.body.konsul_id);
  const data = req.body;
  if (!id) return errorResponse(res, 'konsul_id required', 400);
  try {
    const [result]: any = await pool.query('UPDATE sw_konsultasi SET ? WHERE konsul_id = ?', [data, id]);
    return successResponse(res, { affectedRows: result.affectedRows }, 'Konsul updated');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const insertChatMessage = async (req: Request, res: Response) => {
  const data = req.body;
  if (!data) return errorResponse(res, 'body required', 400);
  try {
    const [result]: any = await pool.query('INSERT INTO sw_konsultasi_dtl SET ?', [data]);
    return successResponse(res, { insertId: result.insertId }, 'Chat inserted');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const updateChatMessageStatus = async (req: Request, res: Response) => {
  const id = toNum(req.params.konsul_id || req.body.konsul_id);
  const data = req.body;
  if (!id) return errorResponse(res, 'konsul_id required', 400);
  try {
    await pool.query('UPDATE sw_konsultasi_dtl SET ? WHERE konsul_id = ? AND dari = 1', [data, id]);
    return successResponse(res, {}, 'Chat status updated');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};