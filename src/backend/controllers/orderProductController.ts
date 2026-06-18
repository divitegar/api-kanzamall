import { Request, Response } from 'express';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';

export const getOrderProduk = async (req: Request, res: Response) => {
  const order_id = req.query.order_id ?? req.params.order_id;
  const customer_id = req.query.customer_id ?? req.params.customer_id;
  const order_status_id = req.query.order_status_id ?? req.params.order_status_id;

  try {
    let q = `SELECT 
          op.order_product_id,
          op.order_id,
          op.product_id,
          op.quantity,
          op.price,
          op.name,
          p.sku, 
          p.image, 
          ord.invoice_no, 
          DATE(ord.date_added) as tanggal,
          ord.currency_value as total_order,
          ord.store_name,
          ord.payment_firstname as recipient_name,
          ord.payment_address_1 as recipient_address,
          ord.payment_city as recipient_city,
          ord.payment_postcode as recipient_postcode,
          ord.payment_country as recipient_country,
          ord.payment_zone as recipient_zone,
          ord.shipping_cost,
          ord.angka_unik as admin_fee,
          COALESCE(tp.total_product, 0) as total_product,
          os.name as status_name,
          os.order_status_id,
          pd.name as product_name
      FROM sw_order_product op
      LEFT JOIN sw_product p 
          ON p.product_id = op.product_id
      LEFT JOIN sw_order ord 
          ON ord.order_id = op.order_id
      LEFT JOIN sw_order_status os 
          ON os.order_status_id = ord.order_status_id
      LEFT JOIN sw_product_description pd 
          ON pd.product_id = p.product_id
      LEFT JOIN (
          SELECT order_id, COUNT(*) as total_product
          FROM sw_order_product
          GROUP BY order_id
      ) tp 
          ON tp.order_id = op.order_id`;

      const whereClauses: string[] = [];
      const params: any[] = [];

      if (order_id) {
        whereClauses.push('op.order_id = ?');
        params.push(Number(order_id));
      }

      if (customer_id) {
        whereClauses.push('ord.customer_id = ?');
        params.push(Number(customer_id));
      }

      if (order_status_id) {
        whereClauses.push('ord.order_status_id = ?');
        params.push(Number(order_status_id));
      }

      if (whereClauses.length > 0) {
        q += ' WHERE ' + whereClauses.join(' AND ');
      }

    q += ' ORDER BY op.order_id ASC, op.order_product_id ASC';

    const [rows]: any = await pool.query(q, params);


    const groupedOrders = new Map<number, {
      order_id: number;
      invoice_no: string | null;
      tanggal: string | null;
      total_order: number | null;
      total_product: number;
      status_name: string | null;
      order_status_id: number | null;
      store_name: string | null;
      recipient_name: string | null;
      recipient_address: string | null;
      recipient_city: string | null;
      recipient_postcode: string | null;
      recipient_country: string | null;
      recipient_zone: string | null;
      shipping_cost: number | null;
      admin_fee: number | null;
      products: Array<{
        product_id: number;
        sku: string | null;
        image: string | null;
        quantity: number;
        price: number | null;
        name: string | null;
      }>;
    }>();

    for (const row of rows || []) {
      const normalizedOrderId = Number(row.order_id);
      const existingOrder = groupedOrders.get(normalizedOrderId);

      if (existingOrder) {
        existingOrder.products.push({
          product_id: Number(row.product_id),
          sku: row.sku ?? null,
          image: row.image ?? null,
          quantity: Number(row.quantity ?? 0),
          price: row.price !== undefined && row.price !== null ? Number(row.price) : null,
          name: row.name ?? null
        });
        continue;
      }

      groupedOrders.set(normalizedOrderId, {
        order_id: normalizedOrderId,
        invoice_no: row.invoice_no ?? null,
        tanggal: row.tanggal ?? null,
        total_order: Number(row.total_order ?? 0),
        total_product: Number(row.total_product ?? 0),
        status_name: row.status_name ?? null,
        order_status_id: row.order_status_id !== undefined && row.order_status_id !== null ? Number(row.order_status_id) : null,
        store_name: row.store_name ?? null, 
        recipient_name: row.recipient_name ?? null,
        recipient_address: row.recipient_address ?? null,
        recipient_city: row.recipient_city ?? null,
        recipient_postcode: row.recipient_postcode ?? null,
        recipient_country: row.recipient_country ?? null,
        recipient_zone: row.recipient_zone ?? null,
        shipping_cost: row.shipping_cost !== undefined && row.shipping_cost !== null ? Number(row.shipping_cost) : null,
        admin_fee: row.admin_fee !== undefined && row.admin_fee !== null ? Number(row.admin_fee) : null,
        products: [
          {
            product_id: Number(row.product_id),
            sku: row.sku ?? null,
            image: row.image ?? null,
            quantity: Number(row.quantity ?? 0),
            price: row.price !== undefined && row.price !== null ? Number(row.price) : null,
            name: row.name
          }
        ]
      });
    }

    return res.status(200).json(Array.from(groupedOrders.values()));

  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};

export const getOrderHistory = async (req: Request, res: Response) => {
  const order_id = req.query.order_id ?? req.params.order_id;
  try {
    let q = `SELECT h.*, s.name as status_name FROM sw_order_history h LEFT JOIN sw_order_status s ON h.order_status_id = s.order_status_id`;
    const params: any[] = [];
    if (order_id) {
      q += ' WHERE h.order_id = ?';
      params.push(order_id);
    }
    const [rows] = await pool.query(q, params);
    return successResponse(res, { history: rows }, 'Order history retrieved');
  } catch (err: any) {
    return errorResponse(res, err.message || 'DB error', 500);
  }
};