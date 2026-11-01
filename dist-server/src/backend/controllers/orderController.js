import pool from "../config/db.js";
import { successResponse, errorResponse } from "../helpers/apiResponse.js";
const FRONTEND_BASE_URL = String(process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const toNum = (v) => (v === undefined || v === null ? undefined : Number(v));
const toSafeNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
};
const toMidtransCountryCode = (value) => {
    const raw = String(value || "")
        .trim()
        .toUpperCase();
    if (!raw)
        return "IDN";
    // Common inputs we receive from legacy/frontend payloads.
    if (raw === "INDONESIA" || raw === "ID" || raw === "IDN")
        return "IDN";
    // Midtrans expects ISO alpha-3.
    if (raw.length === 3)
        return raw;
    return "IDN";
};
const extractProductId = (item) => {
    if (item.product_id !== undefined && item.product_id !== null) {
        return toSafeNum(item.product_id, 0);
    }
    if (item.id !== undefined && item.id !== null) {
        const raw = String(item.id);
        const dashIndex = raw.indexOf("-");
        const candidate = dashIndex >= 0 ? raw.substring(0, dashIndex) : raw;
        return toSafeNum(candidate, 0);
    }
    return 0;
};
const generateInvoiceNo = (invoicePrefix, orderId) => {
    const prefix = (invoicePrefix || "INV").trim();
    const suffix = String(orderId + 10000000).substring(3);
    return `${prefix}${suffix}`;
};
const normalizeStoreItems = (store, allItems) => {
    if (Array.isArray(store.items) && store.items.length > 0)
        return store.items;
    if (Array.isArray(store.products) && store.products.length > 0)
        return store.products;
    const storeId = toSafeNum(store.store_id, 0);
    if (!storeId)
        return [];
    return allItems.filter((item) => toSafeNum(item.store_id, 0) === storeId);
};
const processMutasiForOrder = async (conn, orderId) => {
    const [rows] = await conn.query(`SELECT o.store_id, op.product_id, op.quantity
     FROM sw_order_product op
     LEFT JOIN sw_order o ON o.order_id = op.order_id
     WHERE op.order_id = ?`, [orderId]);
    for (const row of rows || []) {
        let mutasi = Number(row.quantity || 0);
        const store_id = row.store_id;
        const product_id = row.product_id;
        const [dtls] = await conn.query(`SELECT * FROM sw_product_to_store_dtl
       WHERE store_id = ? AND product_id = ? AND sisa > 0
       ORDER BY product_to_store_dtl_id ASC`, [store_id, product_id]);
        for (const d of dtls || []) {
            if (mutasi <= 0)
                break;
            let sisa = Number(d.sisa || 0);
            let mutasi1 = 0;
            if (sisa > 0) {
                if (sisa - mutasi > 0) {
                    sisa = sisa - mutasi;
                    mutasi1 = mutasi;
                    mutasi = 0;
                }
                else {
                    mutasi = mutasi - sisa;
                    mutasi1 = Number(d.sisa || 0);
                    sisa = 0;
                }
                const newMutasi = Number(d.mutasi || 0) + mutasi1;
                await conn.query("UPDATE sw_product_to_store_dtl SET ? WHERE product_to_store_dtl_id = ?", [{ mutasi: newMutasi, sisa }, d.product_to_store_dtl_id]);
            }
        }
    }
};
const getMidtransConfig = async (payload) => {
    const config = {
        client_key: payload.client_key,
        server_key: payload.server_key,
        environment: payload.environment,
        link: payload.link,
    };
    if (config.client_key && config.server_key)
        return config;
    const [rows] = await pool.query("SELECT client_key, server_key, environment, link FROM sw_api_midtrans WHERE status = 1 LIMIT 1");
    if (rows && rows.length > 0) {
        const active = rows[0] || {};
        return {
            client_key: config.client_key || active.client_key,
            server_key: config.server_key || active.server_key,
            environment: config.environment || active.environment,
            link: config.link || active.link,
        };
    }
    return config;
};
const resolveMidtransTransactionUrl = (environment, link) => {
    const defaultSnapUrl = environment === "production" ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions";
    const rawLink = String(link || "").trim();
    if (!rawLink) {
        return defaultSnapUrl;
    }
    if (rawLink.includes("/snap/v1/transactions")) {
        return rawLink;
    }
    if (rawLink.includes("snap.js") || rawLink.endsWith("/snap/snap.js")) {
        return defaultSnapUrl;
    }
    return rawLink;
};
const createMidtransSnap = async (payload, transactionBody) => {
    const paymentMethod = String(payload.payment_method || "").toLowerCase();
    if (paymentMethod !== "midtrans") {
        return {
            enabled: false,
            reason: "payment_method is not midtrans",
        };
    }
    const config = await getMidtransConfig(payload);
    const serverKey = config.server_key || "";
    const environment = String(config.environment || "sandbox").toLowerCase();
    const snapUrl = resolveMidtransTransactionUrl(environment, config.link);
    if (!serverKey) {
        return {
            enabled: false,
            reason: "server_key is missing",
            client_key: config.client_key,
            environment,
            snap_api_url: snapUrl,
        };
    }
    try {
        const auth = Buffer.from(`${serverKey}:`).toString("base64");
        const resp = await fetch(snapUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Basic ${auth}`,
            },
            body: JSON.stringify(transactionBody),
        });
        const text = await resp.text();
        const parsed = text ? JSON.parse(text) : {};
        if (!resp.ok) {
            return {
                enabled: true,
                client_key: config.client_key,
                environment,
                snap_api_url: snapUrl,
                error: parsed?.error_messages || parsed || `Midtrans error ${resp.status}`,
            };
        }
        return {
            enabled: true,
            client_key: config.client_key,
            environment,
            snap_api_url: snapUrl,
            snap_token: parsed?.token || null,
            redirect_url: parsed?.redirect_url || null,
        };
    }
    catch (err) {
        return {
            enabled: true,
            client_key: config.client_key,
            environment,
            snap_api_url: snapUrl,
            error: err?.message || "Failed to call Midtrans",
        };
    }
};
const saveCheckoutMultiStore = async (req, res) => {
    const payload = req.body || {};
    const stores = Array.isArray(payload.stores) && payload.stores.length > 0
        ? payload.stores
        : [
            {
                store_id: payload.store_id,
                store_name: payload.store_name,
                subtotal: payload.subtotal ?? payload.currency_value,
                tot_qty: payload.tot_qty ?? payload.total,
                berat: payload.berat ?? payload.weight,
                shipping_cost: payload.shipping_cost ?? payload.ongkir,
                ongkir: payload.ongkir ?? payload.shipping_cost,
                shipping_method: payload.shipping_method,
                tariff_code: payload.tariff_code,
                code_origin: payload.code_origin,
                data_origin: payload.data_origin,
                items: payload.items,
                products: payload.products,
            },
        ];
    const allItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.products) ? payload.products : [];
    if (stores.length > 1) {
        return errorResponse(res, "Checkout multi-store dinonaktifkan. Gunakan 1 store per transaksi.", 400);
    }
    if (!stores.length) {
        return errorResponse(res, "stores is required", 400);
    }
    const customerId = toSafeNum(payload.customer_id, 0);
    payload.customer_id = customerId;
    if (!payload.firstname || !payload.email || !payload.telephone) {
        return errorResponse(res, "Nama, email, dan nomor telepon wajib diisi untuk membuat transaksi", 400);
    }
    const conn = await pool.getConnection();
    const now = new Date().toISOString().slice(0, 10);
    const adminFee = toSafeNum(payload.admin_fee ?? payload.unik ?? payload.angka_unik, 0);
    const orderResults = [];
    const midtransItems = [];
    let transactionOrderId = "";
    let grossAmount = 0;
    try {
        await conn.beginTransaction();
        for (let index = 0; index < stores.length; index += 1) {
            const store = stores[index];
            const storeId = toSafeNum(store.store_id, 0);
            if (!storeId) {
                throw new Error(`store_id invalid at index ${index}`);
            }
            const normalizedItems = normalizeStoreItems(store, allItems);
            if (!normalizedItems.length) {
                throw new Error(`items kosong untuk store_id ${storeId}`);
            }
            const mappedItems = normalizedItems.map((item) => {
                const productId = extractProductId(item);
                const quantity = toSafeNum(item.qty ?? item.quantity, 0);
                const price = toSafeNum(item.price, 0);
                const reward = toSafeNum(item.reward ?? item.options?.reward, 0);
                const model = item.model || item.options?.name_option || "";
                const sku = item.sku || item.options?.sku || "";
                const name = String(item.name || "").trim();
                if (!productId || quantity <= 0 || price < 0 || !name) {
                    throw new Error(`item invalid pada store_id ${storeId}`);
                }
                return {
                    productId,
                    quantity,
                    price,
                    reward,
                    model,
                    sku,
                    name,
                    total: price * quantity,
                };
            });
            const subtotal = mappedItems.reduce((sum, item) => sum + item.total, 0);
            const shippingCost = toSafeNum(store.ongkir ?? store.shipping_cost, 0);
            const totalQty = toSafeNum(store.tot_qty ?? store.total, mappedItems.reduce((sum, item) => sum + item.quantity, 0));
            const weight = toSafeNum(store.berat ?? store.weight ?? payload.berat ?? payload.weight, 0);
            const adminFeeForStore = index === 0 ? adminFee : 0;
            const orderData = {
                store_id: storeId,
                store_name: store.store_name || payload.store_name || "",
                order_status_id: payload.order_status_id || "1",
                invoice_no: payload.invoice_no || "",
                customer_id: payload.customer_id,
                comment: payload.comment || "",
                type_user: payload.type_user,
                customer_group_id: payload.customer_group_id,
                firstname: payload.firstname,
                lastname: payload.lastname,
                email: payload.email,
                telephone: payload.telephone,
                hp_distributor: payload.hp_distributor,
                payment_firstname: payload.payment_firstname,
                payment_company: payload.payment_company,
                payment_address_1: payload.payment_address_1,
                payment_address_2: payload.payment_address_2,
                payment_postcode: payload.payment_postcode,
                payment_city: payload.payment_city,
                payment_zone: payload.payment_zone,
                payment_country: payload.payment_country,
                payment_city_id: payload.payment_city_id,
                payment_zone_id: payload.payment_zone_id,
                payment_country_id: payload.payment_country_id,
                payment_method: payload.payment_method,
                currency_value: toSafeNum(store.subtotal ?? store.currency_value, subtotal),
                angka_unik: adminFeeForStore,
                currency_code: payload.currency_code || "Rp.",
                total: totalQty,
                weight,
                shipping_firstname: payload.shipping_firstname,
                shipping_telephone: payload.shipping_telephone,
                shipping_company: payload.shipping_company,
                shipping_address_1: payload.shipping_address_1,
                shipping_address_2: payload.shipping_address_2,
                shipping_postcode: payload.shipping_postcode,
                shipping_city: payload.shipping_city,
                shipping_zone: payload.shipping_zone,
                shipping_country: payload.shipping_country,
                shipping_city_id: payload.shipping_city_id,
                shipping_zone_id: payload.shipping_zone_id,
                shipping_method: store.shipping_method || payload.shipping_method,
                shipping_cost: shippingCost,
                tariff_code: store.tariff_code || payload.tariff_code,
                code_origin: store.code_origin || payload.code_origin,
                data_origin: store.data_origin || payload.data_origin,
                date_added: now,
                ip: req.ip,
            };
            const orderFields = Object.keys(orderData);
            const orderPlaceholders = orderFields.map(() => "?").join(", ");
            const orderParams = orderFields.map((k) => orderData[k]);
            const [orderResult] = await conn.query(`INSERT INTO sw_order (${orderFields.join(",")}) VALUES (${orderPlaceholders})`, orderParams);
            const orderId = Number(orderResult.insertId);
            const invoiceNo = generateInvoiceNo(payload.invoice_no, orderId);
            await conn.query("UPDATE sw_order SET invoice_no = ? WHERE order_id = ?", [invoiceNo, orderId]);
            for (const item of mappedItems) {
                const detailData = {
                    order_id: orderId,
                    product_id: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total,
                    reward: item.reward,
                    model: item.model,
                    sku: item.sku,
                };
                const detailFields = Object.keys(detailData);
                const detailPlaceholders = detailFields.map(() => "?").join(", ");
                const detailParams = detailFields.map((k) => detailData[k]);
                await conn.query(`INSERT INTO sw_order_product (${detailFields.join(",")}) VALUES (${detailPlaceholders})`, detailParams);
                midtransItems.push({
                    id: `${storeId}-${item.productId}`,
                    price: Math.round(item.price),
                    quantity: item.quantity,
                    name: item.name,
                });
            }
            const historyData = {
                order_id: orderId,
                order_status_id: payload.order_status_id || "1",
                comment: payload.comment || "",
                date_added: now,
            };
            const historyFields = Object.keys(historyData);
            const historyPlaceholders = historyFields.map(() => "?").join(", ");
            const historyParams = historyFields.map((k) => historyData[k]);
            await conn.query(`INSERT INTO sw_order_history (${historyFields.join(",")}) VALUES (${historyPlaceholders})`, historyParams);
            await processMutasiForOrder(conn, orderId);
            if (shippingCost > 0) {
                midtransItems.push({
                    id: `SHIP-${storeId}`,
                    price: Math.round(shippingCost),
                    quantity: 1,
                    name: `Ongkir ${store.store_name || `Store ${storeId}`}`,
                });
            }
            if (adminFeeForStore > 0) {
                midtransItems.push({
                    id: "ADMIN-FEE",
                    price: Math.round(adminFeeForStore),
                    quantity: 1,
                    name: "Biaya Admin Transfer",
                });
            }
            orderResults.push({
                order_id: orderId,
                invoice_no: invoiceNo,
                store_id: storeId,
                store_name: store.store_name || payload.store_name || "",
                subtotal,
                shipping_cost: shippingCost,
                admin_fee: adminFeeForStore,
                total_amount: subtotal + shippingCost + adminFeeForStore,
                total_qty: totalQty,
                weight,
            });
        }
        grossAmount = midtransItems.reduce((sum, item) => sum + Math.round(item.price) * item.quantity, 0);
        const firstInvoice = orderResults[0]?.invoice_no || `TRX-${Date.now()}`;
        transactionOrderId = `${firstInvoice}`;
        await conn.commit();
    }
    catch (err) {
        await conn.rollback();
        conn.release();
        return errorResponse(res, err.message || "Checkout failed", 400);
    }
    conn.release();
    const billingAddress = {
        first_name: payload.payment_firstname || payload.firstname || "",
        last_name: payload.lastname || "",
        address: `${payload.payment_address_1 || ""} ${payload.payment_address_2 || ""}`.trim(),
        city: payload.payment_city || "",
        postal_code: payload.payment_postcode || "",
        phone: payload.telephone || "",
        country_code: toMidtransCountryCode(payload.payment_country),
    };
    const shippingAddress = {
        first_name: payload.shipping_firstname || payload.firstname || "",
        last_name: payload.lastname || "",
        address: `${payload.shipping_address_1 || ""} ${payload.shipping_address_2 || ""}`.trim(),
        city: payload.shipping_city || "",
        postal_code: payload.shipping_postcode || "",
        phone: payload.shipping_telephone || payload.telephone || "",
        country_code: toMidtransCountryCode(payload.shipping_country),
    };
    const customerDetails = {
        firstname: payload.firstname || "",
        lastname: payload.lastname || "",
        email: payload.email || "",
        phone: payload.telephone || "",
        billing_address: billingAddress,
        shipping_address: shippingAddress,
    };
    const transaction = {
        customer_details: customerDetails,
        item_details: midtransItems,
        transaction_details: {
            order_id: transactionOrderId,
            gross_amount: Math.round(grossAmount),
        },
        callbacks: {
            finish: `${FRONTEND_BASE_URL}/payment/finish?order_id=${encodeURIComponent(String(orderResults[0]?.order_id || ""))}&invoice_no=${encodeURIComponent(String(orderResults[0]?.invoice_no || ""))}`,
            error: `${FRONTEND_BASE_URL}/payment/error?order_id=${encodeURIComponent(String(orderResults[0]?.order_id || ""))}&invoice_no=${encodeURIComponent(String(orderResults[0]?.invoice_no || ""))}`,
            pending: `${FRONTEND_BASE_URL}/profile/orders/${encodeURIComponent(String(orderResults[0]?.order_id || ""))}`,
        },
    };
    const midtrans = await createMidtransSnap(payload, transaction);
    return successResponse(res, {
        orders: orderResults,
        checkout_summary: {
            store_count: orderResults.length,
            gross_amount: Math.round(grossAmount),
            transaction_order_id: transactionOrderId,
        },
        transaction,
        midtrans,
    }, "Checkout single-store berhasil diproses", 201);
};
export const getOrders = async (req, res) => {
    const customer_id = req.query.customer_id ?? req.params.customer_id;
    const order_id = req.query.order_id ?? req.params.order_id;
    try {
        let query = `SELECT o.*, os.name as status_name FROM sw_order o LEFT JOIN sw_order_status os ON o.order_status_id = os.order_status_id`;
        const params = [];
        if (order_id) {
            query += " WHERE o.order_id = ?";
            params.push(order_id);
        }
        else if (customer_id) {
            query += " WHERE o.customer_id = ?";
            params.push(customer_id);
        }
        query += " ORDER BY o.order_id DESC";
        const [rows] = await pool.query(query, params);
        return successResponse(res, { orders: rows }, "Orders retrieved");
    }
    catch (err) {
        return errorResponse(res, err.message || "DB error", 500);
    }
};
export const getOrderProducts = async (req, res) => {
    const order_id = req.query.order_id ?? req.params.order_id;
    try {
        let query = `SELECT op.* FROM sw_order_product op`;
        const params = [];
        if (order_id) {
            query += " WHERE op.order_id = ?";
            params.push(order_id);
        }
        const [rows] = await pool.query(query, params);
        return successResponse(res, { products: rows }, "Order products retrieved");
    }
    catch (err) {
        return errorResponse(res, err.message || "DB error", 500);
    }
};
export const saveOrder = async (req, res) => {
    const jenis = req.query.jenis ?? req.body.jenis;
    const data = req.body;
    if (!data)
        return errorResponse(res, "body required", 400);
    try {
        const hasStores = Array.isArray(data.stores) && data.stores.length > 0;
        const hasMultipleStores = Array.isArray(data.stores) && data.stores.length > 1;
        const hasItems = (Array.isArray(data.items) && data.items.length > 0) || (Array.isArray(data.products) && data.products.length > 0);
        if (jenis === "checkout-multi") {
            return errorResponse(res, "Mode checkout-multi dinonaktifkan. Gunakan checkout single-store.", 400);
        }
        if (hasMultipleStores) {
            return errorResponse(res, "Checkout multi-store dinonaktifkan. Maksimal 1 store per transaksi.", 400);
        }
        if (jenis === "mst" && (hasStores || hasItems)) {
            return saveCheckoutMultiStore(req, res);
        }
        if (jenis === "mst") {
            const [result] = await pool.query("INSERT INTO sw_order SET ?", [data]);
            return successResponse(res, { insertId: result.insertId }, "Order mst saved");
        }
        if (jenis === "dtl") {
            const [result] = await pool.query("INSERT INTO sw_order_product SET ?", [data]);
            return successResponse(res, { insertId: result.insertId }, "Order product saved");
        }
        if (jenis === "histori") {
            const [result] = await pool.query("INSERT INTO sw_order_history SET ?", [data]);
            return successResponse(res, { insertId: result.insertId }, "Order history saved");
        }
        return errorResponse(res, "Invalid jenis", 400);
    }
    catch (err) {
        return errorResponse(res, err.message || "DB error", 500);
    }
};
export const updateOrder = async (req, res) => {
    const order_id = req.params.order_id ?? req.body.order_id;
    const data = req.body;
    if (!order_id)
        return errorResponse(res, "order_id required", 400);
    try {
        const [result] = await pool.query("UPDATE sw_order SET ? WHERE order_id = ?", [data, order_id]);
        return successResponse(res, { affectedRows: result.affectedRows }, "Order updated");
    }
    catch (err) {
        return errorResponse(res, err.message || "DB error", 500);
    }
};
export const updateOrderHistori = async (req, res) => {
    const order_id = req.params.order_id ?? req.body.order_id;
    const data = req.body;
    if (!order_id)
        return errorResponse(res, "order_id required", 400);
    try {
        const [result] = await pool.query("UPDATE sw_order_history SET ? WHERE order_id = ?", [data, order_id]);
        return successResponse(res, { affectedRows: result.affectedRows }, "Order history updated");
    }
    catch (err) {
        return errorResponse(res, err.message || "DB error", 500);
    }
};
export const saveTest = async (req, res) => {
    const data = req.body;
    if (!data)
        return errorResponse(res, "body required", 400);
    try {
        const [result] = await pool.query("INSERT INTO sw_test SET ?", [data]);
        return successResponse(res, { insertId: result.insertId }, "Test saved");
    }
    catch (err) {
        return errorResponse(res, err.message || "DB error", 500);
    }
};
export const mutasiStok = async (req, res) => {
    const order_id = req.params.order_id ?? req.query.order_id;
    if (!order_id)
        return errorResponse(res, "order_id required", 400);
    try {
        const [rows] = await pool.query(`SELECT o.store_id, op.product_id, op.quantity FROM sw_order_product op LEFT JOIN sw_order o ON o.order_id = op.order_id WHERE op.order_id = ?`, [order_id]);
        for (const row of rows) {
            let mutasi = Number(row.quantity || 0);
            const store_id = row.store_id;
            const product_id = row.product_id;
            const [dtls] = await pool.query(`SELECT * FROM sw_product_to_store_dtl WHERE store_id = ? AND product_id = ? AND sisa > 0 ORDER BY product_to_store_dtl_id ASC`, [store_id, product_id]);
            for (const d of dtls) {
                if (mutasi <= 0)
                    break;
                let sisa = d.sisa;
                let mutasi1 = 0;
                if (sisa > 0) {
                    if (sisa - mutasi > 0) {
                        sisa = sisa - mutasi;
                        mutasi1 = mutasi;
                        mutasi = 0;
                    }
                    else {
                        mutasi = mutasi - sisa;
                        mutasi1 = d.sisa;
                        sisa = 0;
                    }
                    const newMutasi = d.mutasi + mutasi1;
                    await pool.query("UPDATE sw_product_to_store_dtl SET ? WHERE product_to_store_dtl_id = ?", [{ mutasi: newMutasi, sisa }, d.product_to_store_dtl_id]);
                }
            }
        }
        return successResponse(res, {}, "Mutasi stok processed");
    }
    catch (err) {
        return errorResponse(res, err.message || "DB error", 500);
    }
};
