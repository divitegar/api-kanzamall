import { Request, Response } from "express";
import pool from "../config/db.js";
import { successResponse, errorResponse } from "../helpers/apiResponse.js";

const toStr = (v: any) => (v === undefined || v === null ? undefined : String(v));

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
      return successResponse(res, { result: rows }, "Komisi summary");
    }

    // fallback: simple filter by id and type_user
    let q2 = `SELECT * FROM sw_komisi WHERE 1=1`;
    const qParams: any[] = [];
    if (params.id) {
      q2 += " AND customer_id = ?";
      qParams.push(params.id);
    }
    if (params.type_user) {
      q2 += " AND type_user = ?";
      qParams.push(params.type_user);
    }
    const [rows2] = await pool.query(q2, qParams);
    return successResponse(res, { result: rows2 }, "Komisi results");
  } catch (err: any) {
    return errorResponse(res, err.message || "DB error", 500);
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
      return successResponse(res, { result: rows }, "Komisi summary");
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
    return successResponse(res, { result: rows2 }, "Komisi filtered");
  } catch (err: any) {
    return errorResponse(res, err.message || "DB error", 500);
  }
};
export const getKomisiTotal = async (req: Request, res: Response) => {
  const customer_id = req.query.customer_id || req.params.customer_id || req.body?.customer_id;

  if (!customer_id) {
    return errorResponse(res, "customer_id is required", 400);
  }

  try {
    const q = `
      SELECT COALESCE(SUM(k.nilai_komisi), 0) as total_komisi
      FROM sw_komisi k
      WHERE k.customer_id = ?
    `;
    const [rows]: any = await pool.query(q, [customer_id]);
    const total = rows[0]?.total_komisi || 0;

    return successResponse(res, { total_komisi: Number(total) }, "Total komisi retrieved");
  } catch (err: any) {
    return errorResponse(res, err.message || "DB error", 500);
  }
};

export const getKomisiDetail = async (req: Request, res: Response) => {
  const customer_id = req.query.customer_id || req.body?.customer_id;
  const order_id = req.query.order_id || req.params.order_id || req.body?.order_id;
  const date_start = toStr(req.query.date_start);
  const date_end = toStr(req.query.date_end);
  const search = toStr(req.query.search);
  const sort_by_raw = toStr(req.query.sort_by) || "tanggal";
  const sort_dir_raw = (toStr(req.query.sort_dir) || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const page = Math.max(1, Number(req.query.page || 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10) || 10));
  const offset = (page - 1) * limit;

  if (!customer_id) {
    return errorResponse(res, "customer_id is required", 400);
  }

  try {
    const sortableColumns: Record<string, string> = {
      tanggal: "k.tanggal",
      nilai_komisi: "k.nilai_komisi",
      nilai_order: "k.nilai_order",
      invoice_no: "o.invoice_no",
      order_id: "k.order_id",
      name: "k.name",
    };
    const sortColumn = sortableColumns[sort_by_raw] || sortableColumns.tanggal;

    let whereClause = ` WHERE k.customer_id = ? `;
    const params: any[] = [customer_id];

    if (order_id) {
      whereClause += " AND k.order_id = ?";
      params.push(order_id);
    }

    if (date_start) {
      whereClause += " AND DATE(k.tanggal) >= ?";
      params.push(date_start);
    }

    if (date_end) {
      whereClause += " AND DATE(k.tanggal) <= ?";
      params.push(date_end);
    }

    if (search) {
      whereClause += " AND (o.invoice_no LIKE ? OR k.name LIKE ? OR k.order_id LIKE ?)";
      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword);
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM sw_komisi k
      LEFT JOIN sw_order o ON o.order_id = k.order_id
      ${whereClause}
    `;

    const [countRows]: any = await pool.query(countQuery, params);
    const totalData = Number(countRows?.[0]?.total || 0) || 0;

    const dataQuery = `
      SELECT k.*, o.invoice_no, o.date_added as order_date
      FROM sw_komisi k
      LEFT JOIN sw_order o ON o.order_id = k.order_id
      ${whereClause}
      ORDER BY ${sortColumn} ${sort_dir_raw}
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, limit, offset];

    const [rows]: any = await pool.query(dataQuery, dataParams);
    const totalKomisi = (rows || []).reduce((sum: number, item: any) => sum + (Number(item.nilai_komisi) || 0), 0);

    return successResponse(
      res,
      {
        komisi: rows,
        pagination: {
          page,
          limit,
          total_data: totalData,
          total_page: Math.max(1, Math.ceil(totalData / limit)),
        },
        filters: {
          date_start: date_start || null,
          date_end: date_end || null,
          search: search || "",
          sort_by: sort_by_raw,
          sort_dir: sort_dir_raw.toLowerCase(),
        },
        summary: {
          current_page_total_komisi: totalKomisi,
        },
      },
      "Komisi detail retrieved",
    );
  } catch (err: any) {
    return errorResponse(res, err.message || "DB error", 500);
  }
};
