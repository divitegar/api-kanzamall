import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
const JNE_BASE_PRICE = process.env.JNE_PRICE_URL || 'https://apiv2.jne.co.id:10206/tracing/api/pricedev';
const JNE_GENERATE = process.env.JNE_GENERATE_URL || 'http://apiv2.jne.co.id:10102/tracing/api/generatecnote';
const JNE_LIST = process.env.JNE_LIST_URL || 'https://apiv2.jne.co.id:10206/tracing/api/list/v1/cnote';
const JNE_PICKUP = process.env.JNE_PICKUP_URL || 'https://apiv2.jne.co.id:10206/pickupcashless';
const JNE_USERNAME = process.env.JNE_USERNAME || 'KANZAMALL';
const JNE_APIKEY = process.env.JNE_APIKEY || '2c31e688003f34ecc8f801bf959eaaf8';
export const getOngkir = async (req, res) => {
    const { from, thru, weight } = req.query;
    if (!from || !thru || !weight)
        return errorResponse(res, 'from, thru, weight required', 400);
    try {
        const body = new URLSearchParams();
        body.append('username', JNE_USERNAME);
        body.append('api_key', JNE_APIKEY);
        body.append('from', String(from));
        body.append('thru', String(thru));
        body.append('weight', String(weight));
        const resp = await fetch(JNE_BASE_PRICE, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: body.toString() });
        const data = await resp.json();
        return successResponse(res, { result: data }, 'Ongkir response');
    }
    catch (err) {
        return errorResponse(res, err.message || 'External API error', 500);
    }
};
export const getResi = async (req, res) => {
    const order_id = req.params.order_id ?? req.query.order_id;
    if (!order_id)
        return errorResponse(res, 'order_id required', 400);
    try {
        // fetch order info
        const [rows] = await pool.query(`SELECT o.*, sd.name as nama_store, sd.telp_owner, sd.alamat, sd.telp_toko, sd.kodepos, z.name as nama_region, ci.name as nama_kota
      FROM sw_order o
      LEFT JOIN sw_store_dtl sd ON sd.store_id = o.store_id
      LEFT JOIN sw_zone z ON sd.country_id = z.country_id AND sd.zone_id = z.zone_id
      LEFT JOIN sw_city ci ON sd.country_id = ci.country_id AND sd.zone_id = ci.zone_id AND sd.city_id = ci.city_id
      WHERE o.order_id = ?`, [order_id]);
        const row = rows && rows[0];
        if (!row)
            return errorResponse(res, 'order not found', 404);
        const service = (() => {
            if (row.shipping_method?.includes('YES'))
                return 'YES';
            return 'REG';
        })();
        const params = new URLSearchParams();
        params.append('username', JNE_USERNAME);
        params.append('api_key', JNE_APIKEY);
        // add required fields per original mapping (simplified)
        params.append('OLSHOP_BRANCH', String(row.code_origin).substring(0, 3) + '000');
        params.append('OLSHOP_ORDERID', String(row.order_id));
        params.append('OLSHOP_SHIPPER_NAME', row.nama_store || '');
        params.append('OLSHOP_SHIPPER_ADDR1', row.alamat || '');
        params.append('OLSHOP_SHIPPER_CITY', row.nama_kota || '');
        params.append('OLSHOP_SHIPPER_REGION', row.nama_region || '');
        params.append('OLSHOP_SHIPPER_ZIP', row.kodepos || '');
        params.append('OLSHOP_SHIPPER_PHONE', row.telp_toko || '');
        params.append('OLSHOP_RECEIVER_NAME', row.shipping_firstname || '');
        params.append('OLSHOP_RECEIVER_ADDR1', row.shipping_address_1 || '');
        params.append('OLSHOP_RECEIVER_CITY', row.shipping_city || '');
        params.append('OLSHOP_RECEIVER_REGION', row.shipping_zone || '');
        params.append('OLSHOP_RECEIVER_ZIP', row.shipping_postcode || '');
        params.append('OLSHOP_RECEIVER_PHONE', row.shipping_telephone || '');
        params.append('OLSHOP_QTY', String(row.total || 1));
        params.append('OLSHOP_WEIGHT', String(row.weight || 1));
        params.append('OLSHOP_GOODSDESC', 'Paket');
        params.append('OLSHOP_GOODSVALUE', String(row.currency_value || 0));
        params.append('OLSHOP_GOODSTYPE', '2');
        params.append('OLSHOP_INS_FLAG', 'N');
        params.append('OLSHOP_ORIG', row.code_origin || '');
        params.append('OLSHOP_DEST', row.tariff_code || '');
        params.append('OLSHOP_SERVICE', service);
        params.append('OLSHOP_COD_FLAG', 'N');
        params.append('OLSHOP_COD_AMOUNT', '0');
        const resp = await fetch(JNE_GENERATE, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: params.toString() });
        const data = await resp.json();
        return successResponse(res, { result: data }, 'Resi generated');
    }
    catch (err) {
        return errorResponse(res, err.message || 'External API error', 500);
    }
};
export const trackingResi = async (req, res) => {
    const awb = req.params.awb ?? req.query.awb;
    if (!awb)
        return errorResponse(res, 'awb required', 400);
    try {
        const url = `${JNE_LIST}/${awb}`;
        const params = new URLSearchParams();
        params.append('username', JNE_USERNAME);
        params.append('api_key', JNE_APIKEY);
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: params.toString() });
        const data = await resp.json();
        return successResponse(res, { result: data }, 'Tracking result');
    }
    catch (err) {
        return errorResponse(res, err.message || 'External API error', 500);
    }
};
export const pickup = async (req, res) => {
    const order_id = req.params.order_id ?? req.query.order_id;
    const awb_no = req.query.awb_no ?? req.body.awb_no;
    if (!order_id)
        return errorResponse(res, 'order_id required', 400);
    try {
        const [rows] = await pool.query(`SELECT o.*, sd.name as nama_store, sd.telp_owner, sd.alamat, sd.telp_toko, sd.kodepos, z.name as nama_region, ci.name as nama_kota, co.name as nama_negara
      FROM sw_order o
      LEFT JOIN sw_store_dtl sd ON sd.store_id = o.store_id
      LEFT JOIN sw_country co ON sd.country_id = co.country_id
      LEFT JOIN sw_zone z ON sd.country_id = z.country_id AND sd.zone_id = z.zone_id
      LEFT JOIN sw_city ci ON sd.country_id = ci.country_id AND sd.zone_id = ci.zone_id AND sd.city_id = ci.city_id
      WHERE o.order_id = ?`, [order_id]);
        const row = rows && rows[0];
        if (!row)
            return errorResponse(res, 'order not found', 404);
        const service = row.shipping_method?.includes('YES') ? 'YES' : 'REG';
        const params = new URLSearchParams();
        params.append('username', JNE_USERNAME);
        params.append('api_key', JNE_APIKEY);
        params.append('PICKUP_NAME', row.nama_store || '');
        params.append('PICKUP_DATE', '');
        params.append('PICKUP_TIME', '');
        params.append('PICKUP_PIC', '');
        params.append('PICKUP_PIC_PHONE', row.telp_toko || '');
        params.append('PICKUP_ADDRESS', row.alamat || '');
        params.append('PICKUP_CITY', row.nama_kota || '');
        params.append('BRANCH', String(row.code_origin).substring(0, 3) + '000');
        params.append('CUST_ID', '80599200');
        params.append('ORDER_ID', String(row.order_id));
        params.append('SHIPPER_NAME', row.nama_store || '');
        params.append('SHIPPER_ADDR1', row.alamat || '');
        params.append('SHIPPER_CITY', row.nama_kota || '');
        params.append('SHIPPER_ZIP', row.kodepos || '');
        params.append('SHIPPER_REGION', row.nama_region || '');
        params.append('SHIPPER_PHONE', row.telp_toko || '');
        params.append('RECEIVER_NAME', row.shipping_firstname || '');
        params.append('RECEIVER_ADDR1', row.shipping_address_1 || '');
        params.append('RECEIVER_CITY', row.shipping_city || '');
        params.append('RECEIVER_ZIP', row.shipping_postcode || '');
        params.append('RECEIVER_REGION', row.shipping_zone || '');
        params.append('RECEIVER_PHONE', row.shipping_telephone || '');
        params.append('ORIGIN_CODE', row.code_origin || '');
        params.append('DESTINATION_CODE', row.tariff_code || '');
        params.append('SERVICE_CODE', service);
        params.append('WEIGHT', String(row.weight || 1));
        params.append('QTY', String(row.total || 1));
        params.append('GOODS_DESC', 'Paket');
        params.append('AWB', String(awb_no || ''));
        const resp = await fetch(JNE_PICKUP, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: params.toString() });
        const data = await resp.json();
        return successResponse(res, { result: data }, 'Pickup response');
    }
    catch (err) {
        return errorResponse(res, err.message || 'External API error', 500);
    }
};
