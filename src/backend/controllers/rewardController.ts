import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getRewardDtlx = async (req: Request, res: Response) => {
  const customer_id = (req.query.customer_id as string) || (req.body && req.body.customer_id);
  if (!customer_id) return errorResponse(res, 'customer_id is required');

  try {
    const query = `
      SELECT (o_p.quantity * o_p.reward) as reward, o.invoice_no, o.order_id, c.firstname as customer_name,
             c.type_user as tipe, o.date_added as tanggal, o.customer_id, o_p.product_id, c.*
      FROM sw_order o
      LEFT JOIN sw_order_product o_p ON o_p.order_id = o.order_id
      LEFT JOIN sw_customer c ON c.customer_id = o.customer_id
      WHERE o.customer_id = ? AND o.order_status_id = 7
      ORDER BY o.date_added ASC
    `;
    const [rows]: any = await pool.query(query, [customer_id]);
    return successResponse(res, { rewards: rows });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getRewardDtl = async (req: Request, res: Response) => {
  const customer_id = (req.query.customer_id as string) || (req.body && req.body.customer_id);
  const no_invoice = (req.query.no_invoice as string) || (req.body && req.body.no_invoice);

  try {
    let query = `
      SELECT r.reward, r.invoice_no, r.customer_name, r.type_user as tipe, r.tanggal, c.*
      FROM sw_customer c
      LEFT JOIN _reward_dtl r ON r.customer_id = c.customer_id
    `;

    const params: any[] = [];
    const where: string[] = [];

    if (customer_id) {
      where.push('c.customer_id = ?');
      params.push(customer_id);
    }
    if (no_invoice) {
      where.push('r.order_id = ?');
      params.push(no_invoice);
    }

    if (where.length > 0) query += ' WHERE ' + where.join(' AND ');
    query += ' ORDER BY r.tanggal ASC';

    const [rows]: any = await pool.query(query, params);
    return successResponse(res, { rewards: rows });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getRewardMst = async (req: Request, res: Response) => {
  const customer_id = req.query.customer_id as string | undefined;
  try {
    let query = `
      SELECT r.invoice_no, r.order_id, SUM(r.reward) as reward, r.customer_name, r.type_user as tipex,
             o.firstname as nama_invoice, o.type_user as tipe, o.customer_id as cust_id_invoice,
             r.tanggal, DATE_FORMAT(r.tanggal, '%Y%m') as periode, c.*
      FROM sw_customer c
      INNER JOIN sw_customer_reward_dtl r ON c.customer_id = r.customer_id
      LEFT JOIN sw_order o ON r.order_id = o.order_id
      WHERE c.status = 1
    `;

    const params: any[] = [];
    if (customer_id) {
      query += ' AND c.customer_id = ?';
      params.push(customer_id);
    }

    query += ' GROUP BY r.invoice_no ORDER BY r.tanggal ASC';

    const [rows]: any = await pool.query(query, params);
    return successResponse(res, { reward_master: rows });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getPointRewards = async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    if (!id) {
      const [rows]: any = await pool.query(`SELECT * FROM sw_point_reward WHERE status = '1'`);
      return successResponse(res, { points: rows });
    } else {
      const [rows]: any = await pool.query(`SELECT * FROM sw_point_reward WHERE point_reward_id = ?`, [id]);
      return successResponse(res, { point: rows[0] || null });
    }
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getPencairan = async (req: Request, res: Response) => {
  const customer_id = (req.query.customer_id as string) || (req.body && req.body.customer_id);
  if (!customer_id) return errorResponse(res, 'customer_id is required');

  try {
    const query = `
      SELECT cpr.*, pr.name as name_reward, cps.keterangan as status_reward
      FROM sw_customer_point_reward cpr
      LEFT JOIN sw_point_reward pr ON pr.point_reward_id = cpr.point_reward_id
      LEFT JOIN sw_customer_point_reward_status cps ON cps.id = cpr.status
      WHERE cpr.customer_id = ?
      ORDER BY cpr.date_added DESC
    `;
    const [rows]: any = await pool.query(query, [customer_id]);
    return successResponse(res, { pencairan: rows });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const storeCairReward = async (req: Request, res: Response) => {
  const data = req.body;
  if (!data || !data.customer_id || !data.point_reward_id) return errorResponse(res, 'customer_id and point_reward_id are required');
  try {
    const [result]: any = await pool.query(`INSERT INTO sw_customer_point_reward (customer_id, point_reward_id, points, name, date_added) VALUES (?, ?, ?, ?, ?)`,
      [data.customer_id, data.point_reward_id, data.points || 0, data.name || '', data.date_added || new Date()]
    );
    return successResponse(res, { insertId: result.insertId }, 'Pencairan request stored', 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const updatePointcair = async (req: Request, res: Response) => {
  const data = req.body;
  if (!data || !data.customer_id) return errorResponse(res, 'customer_id is required');
  try {
    const keys = Object.keys(data).filter(k => k !== 'customer_id');
    if (keys.length === 0) return errorResponse(res, 'No fields to update');
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => (data as any)[k]);
    params.push(data.customer_id);
    const [result]: any = await pool.query(`UPDATE sw_customer_reward SET ${setClause} WHERE customer_id = ?`, params);
    return successResponse(res, { affectedRows: result.affectedRows }, 'Customer reward updated');
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const updatePointcair2 = async (req: Request, res: Response) => {
  const data = req.body;
  if (!data || !data.customer_id) return errorResponse(res, 'customer_id is required');
  try {
    const keys = Object.keys(data).filter(k => k !== 'customer_id');
    if (keys.length === 0) return errorResponse(res, 'No fields to update');
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => (data as any)[k]);
    params.push(data.customer_id);
    const [result]: any = await pool.query(`UPDATE sw_customer_reward_dtl SET ${setClause} WHERE customer_id = ?`, params);
    return successResponse(res, { affectedRows: result.affectedRows }, 'Customer reward detail updated');
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getCustomer = async (req: Request, res: Response) => {
  const customer_id = (req.query.customer_id as string) || (req.params && (req.params as any).customer_id);
  try {
    let query = `
      SELECT cr.points, c.*, k.nilai_komisi, mw.name as wilayah_sc
      FROM sw_customer c
      LEFT JOIN sw_customer_reward cr ON cr.customer_id = c.customer_id
      LEFT JOIN sw_komisi k ON k.customer_id = c.customer_id
      LEFT JOIN sw_store s ON s.store_id = c.store_id
      LEFT JOIN sw_mst_wilayah mw ON mw.mst_wilayah_id = s.mst_wilayah_id
      WHERE c.status = 1
    `;
    const params: any[] = [];
    if (customer_id) {
      query += ' AND c.customer_id = ?';
      params.push(customer_id);
    }
    query += ' ORDER BY c.customer_id DESC';

    const [rows]: any = await pool.query(query, params);
    return successResponse(res, { customers: rows });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getCustomerPointsKomisi = async (req: Request, res: Response) => {
  const customer_id = (req.query.customer_id as string) || (req.params && (req.params as any).customer_id);
  if (!customer_id) return errorResponse(res, 'customer_id is required');

  try {
    const query = `
      SELECT
          COALESCE(cr.points, 0) as points,
          COALESCE(k.total_komisi, 0) as total_komisi,
          COALESCE(o.completed_orders, 0) as completed_orders
      FROM sw_customer c
      LEFT JOIN sw_customer_reward cr 
          ON cr.customer_id = c.customer_id
      LEFT JOIN (
          SELECT customer_id, SUM(nilai_komisi) as total_komisi
          FROM sw_komisi
          GROUP BY customer_id
      ) k ON k.customer_id = c.customer_id
      LEFT JOIN (
          SELECT customer_id, COUNT(order_id) as completed_orders
          FROM sw_order
          WHERE order_status_id = 7
          GROUP BY customer_id
      ) o ON o.customer_id = c.customer_id
      WHERE c.customer_id = ?
      AND c.status = 1;
    `;

    const [rows]: any = await pool.query(query, [customer_id]);
    const result = (rows && rows[0]) ? rows[0] : { points: 0, total_komisi: 0, completed_orders: 0 };
    return successResponse(res, { customer_id: Number(customer_id), points: Number(result.points), total_komisi: Number(result.total_komisi), completed_orders: Number(result.completed_orders) });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const cekKodeKanza = async (req: Request, res: Response) => {
  const kode_kanza = (req.query.kode_kanza as string) || (req.body && req.body.kode_kanza);
  if (!kode_kanza) return errorResponse(res, 'kode_kanza is required');
  try {
    const [rows]: any = await pool.query(`SELECT telephone FROM sw_customer WHERE kode_kanza = ? AND type_user = 1`, [kode_kanza]);
    return successResponse(res, { result: rows });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// Ported from legacy "get member" query (last 30 days by distributor/leader)
export const getMemberByDistributor = async (req: Request, res: Response) => {
  const username = String(req.query.customer_id ?? req.query.hp_distributor ?? '').trim();
  const leader = Number(req.query.leader ?? 1);

  if (!username) {
    return errorResponse(res, 'username is required', 400);
  }

  // Legacy logic used "$leader=1" in WHERE; when false, result should be empty.
  if (leader !== 1) {
    return successResponse(res, { members: [] }, 'Members retrieved successfully');
  }

  try {
    const query = `
    SELECT
      c.customer_id,
      c.firstname,
      c.lastname,
      c.email,
      c.telephone,

      -- OMSET CUSTOMER
      COALESCE(SUM(o.currency_value), 0) AS total_omset,

      -- TOTAL ORDER SELESAI
      COUNT(o.order_id) AS completed_orders,

      -- POINT
      COALESCE(cr.points, 0) AS points,

      -- KOMISI
      COALESCE(k.total_komisi, 0) AS total_komisi

    FROM sw_customer me

    -- ambil customer yang pakai hp_distributor = telephone saya
    JOIN sw_customer c 
      ON c.hp_distributor = me.telephone

    -- ORDER milik customer tersebut
    LEFT JOIN sw_order o 
      ON o.customer_id = c.customer_id
      AND o.order_status_id = 7

    -- KOMISI per customer
    LEFT JOIN (
      SELECT customer_id, SUM(nilai_komisi) AS total_komisi
      FROM sw_komisi
      GROUP BY customer_id
    ) k ON k.customer_id = c.customer_id

    -- POINT
    LEFT JOIN sw_customer_reward cr 
      ON cr.customer_id = c.customer_id

    WHERE 
      me.customer_id = 171   -- ini kamu (leader)

    GROUP BY 
      c.customer_id

    ORDER BY 
      total_omset DESC
    `;

    const [rows]: any = await pool.query(query, [username]);
    return successResponse(res, { members: rows }, 'Members retrieved successfully');
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getCustomerMemberList = async (req: Request, res: Response) => {
  const customer_id = Number(req.query.customer_id ?? 0);
  const limit = Number(req.query.limit ?? 10);
  const page = Number(req.query.page ?? 1);
  const offset = (page - 1) * limit;

  // 🔥 FILTER PARAM
  const search = String(req.query.search ?? '').trim();
  const type_user = req.query.type_user !== undefined 
    ? Number(req.query.type_user) 
    : null;

  try {
    if (!customer_id) {
      return errorResponse(res, 'customer_id is required', 400);
    }

    // 🔥 WHERE DINAMIS
    let whereFilter = '';
    const params: any[] = [customer_id];

    if (search) {
      whereFilter += ` AND (c.firstname LIKE ? OR c.lastname LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (type_user !== null) {
      whereFilter += ` AND c.type_user = ?`;
      params.push(type_user);
    }

    // 🔥 QUERY DATA
    const dataQuery = `
      SELECT
        c.customer_id,
        c.firstname,
        c.lastname,
        c.email,
        c.telephone,
        c.type_user,

        COALESCE(o.total_omset, 0) AS total_omset,
        COALESCE(o.completed_orders, 0) AS completed_orders,
        COALESCE(cr.points, 0) AS points,
        COALESCE(k.total_komisi, 0) AS total_komisi,

        COALESCE(cm.total_mitra_reguler, 0) AS total_mitra_reguler,
        COALESCE(cm.total_customer, 0) AS total_customer

      FROM sw_customer me

      JOIN sw_customer c 
        ON c.hp_distributor = me.telephone

      LEFT JOIN sw_customer m 
        ON m.hp_distributor = c.telephone

      -- 🔥 AGREGASI ORDER (AMAN)
      LEFT JOIN (
        SELECT 
          customer_id,
          SUM(currency_value) AS total_omset,
          COUNT(order_id) AS completed_orders
        FROM sw_order
        WHERE order_status_id = 7
        GROUP BY customer_id
      ) o ON o.customer_id = c.customer_id

      -- 🔥 TOTAL MITRA & CUSTOMER
      LEFT JOIN (
        SELECT 
          hp_distributor,
          SUM(CASE WHEN type_user = 1 THEN 1 ELSE 0 END) AS total_mitra_reguler,
          SUM(CASE WHEN type_user = 0 THEN 1 ELSE 0 END) AS total_customer
        FROM sw_customer
        GROUP BY hp_distributor
      ) cm ON cm.hp_distributor = c.telephone

      -- 🔥 TOTAL KOMISI
      LEFT JOIN (
        SELECT customer_id, SUM(nilai_komisi) AS total_komisi
        FROM sw_komisi
        GROUP BY customer_id
      ) k ON k.customer_id = c.customer_id

      LEFT JOIN sw_customer_reward cr 
        ON cr.customer_id = c.customer_id

      WHERE me.customer_id = ?
      ${whereFilter}

      GROUP BY c.customer_id
      ORDER BY total_omset DESC

      LIMIT ? OFFSET ?
    `;

    // 🔥 QUERY COUNT
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sw_customer me
      JOIN sw_customer c 
        ON c.hp_distributor = me.telephone
      WHERE me.customer_id = ?
      ${whereFilter}
    `;

    // count
    const [[countResult]]: any = await pool.query(countQuery, params);
    const totalData = countResult.total;
    const totalPage = Math.ceil(totalData / limit);

    // data
    const [rows]: any = await pool.query(dataQuery, [
      ...params,
      limit,
      offset
    ]);

    return successResponse(
      res,
      {
        customers: rows,
        pagination: {
          total_data: totalData,
          total_page: totalPage,
          current_page: page,
          limit: limit
        }
      },
      'Customer member list retrieved successfully'
    );

  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};