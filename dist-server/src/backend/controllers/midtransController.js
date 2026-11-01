import crypto from "crypto";
import pool from "../config/db.js";
import { successResponse, errorResponse } from "../helpers/apiResponse.js";
const FRONTEND_BASE_URL = String(process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const toOrderStatusId = (transactionStatus, fraudStatus) => {
    const tx = String(transactionStatus || "").toLowerCase();
    const fraud = String(fraudStatus || "").toLowerCase();
    // Pending payment
    if (tx === "pending")
        return 1;
    // Paid
    if (tx === "settlement")
        return 2;
    if (tx === "capture") {
        // credit_card can be challenge/accept
        return fraud === "challenge" ? 1 : 2;
    }
    // Failed / cancelled / expired
    if (tx === "deny" || tx === "failure")
        return 11;
    if (tx === "cancel")
        return 14;
    if (tx === "expire")
        return 16;
    // Refund/chargeback treated as failed payment in current status model
    if (tx === "refund" || tx === "partial_refund" || tx === "chargeback" || tx === "partial_chargeback")
        return 11;
    return 1;
};
const normalizeInvoiceNo = (orderIdFromMidtrans) => {
    const raw = String(orderIdFromMidtrans || "").trim();
    if (!raw)
        return "";
    return raw;
};
const buildOrderHistoryComment = (transactionStatus, paymentType, transactionId) => {
    const tx = String(transactionStatus || "").toLowerCase();
    const payment = String(paymentType || "").trim() || "midtrans";
    const trx = String(transactionId || "").trim();
    const suffix = trx ? ` (trx: ${trx})` : "";
    if (tx === "settlement" || tx === "capture")
        return `Pembayaran Midtrans berhasil via ${payment}${suffix}`;
    if (tx === "pending")
        return `Menunggu pembayaran Midtrans via ${payment}${suffix}`;
    if (tx === "expire")
        return `Pembayaran Midtrans kedaluwarsa${suffix}`;
    if (tx === "cancel")
        return `Pembayaran Midtrans dibatalkan${suffix}`;
    if (tx === "deny" || tx === "failure")
        return `Pembayaran Midtrans gagal${suffix}`;
    return `Notifikasi Midtrans: ${transactionStatus || "-"}${suffix}`;
};
const resolveMidtransTransactionUrl = (environment, link) => {
    const defaultSnapUrl = environment === "production" ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions";
    const rawLink = String(link || "").trim();
    if (!rawLink)
        return defaultSnapUrl;
    if (rawLink.includes("/snap/v1/transactions"))
        return rawLink;
    if (rawLink.includes("snap.js") || rawLink.endsWith("/snap/snap.js"))
        return defaultSnapUrl;
    return rawLink;
};
const getActiveMidtransConfig = async () => {
    const [rows] = await pool.query("SELECT client_key, server_key, environment, link FROM sw_api_midtrans WHERE status = 1 LIMIT 1");
    const active = rows?.[0] || {};
    return {
        client_key: String(active.client_key || ""),
        server_key: String(active.server_key || ""),
        environment: String(active.environment || "sandbox"),
        link: String(active.link || ""),
    };
};
const fetchMidtransStatus = async (orderId, serverKey, environment) => {
    const baseApi = String(environment || "sandbox").toLowerCase() === "production" ? "https://api.midtrans.com/v2" : "https://api.sandbox.midtrans.com/v2";
    const auth = Buffer.from(`${serverKey}:`).toString("base64");
    const resp = await fetch(`${baseApi}/${encodeURIComponent(orderId)}/status`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Basic ${auth}`,
        },
    });
    const text = await resp.text();
    let parsed = {};
    try {
        parsed = text ? JSON.parse(text) : {};
    }
    catch {
        parsed = { raw: text };
    }
    return { ok: resp.ok, status: resp.status, data: parsed };
};
const extractMidtransPaymentInfo = (statusData) => {
    const vaNumbers = Array.isArray(statusData?.va_numbers) ? statusData.va_numbers : [];
    const firstVa = vaNumbers[0] || {};
    const actions = Array.isArray(statusData?.actions) ? statusData.actions : [];
    const instructionAction = actions.find((action) => {
        const name = String(action?.name || "").toLowerCase();
        return name.includes("instruction") || name.includes("how_to_pay") || name.includes("howtopay");
    });
    return {
        transaction_status: String(statusData?.transaction_status || ""),
        payment_type: String(statusData?.payment_type || ""),
        transaction_id: String(statusData?.transaction_id || ""),
        gross_amount: Number(statusData?.gross_amount || 0) || 0,
        transaction_time: String(statusData?.transaction_time || ""),
        expiry_time: String(statusData?.expiry_time || ""),
        settlement_time: String(statusData?.settlement_time || ""),
        va_numbers: vaNumbers,
        va_number: String(firstVa?.va_number || statusData?.permata_va_number || statusData?.bill_key || ""),
        bank: String(firstVa?.bank || statusData?.bank || statusData?.payment_type || ""),
        bill_key: String(statusData?.bill_key || ""),
        biller_code: String(statusData?.biller_code || ""),
        pdf_url: statusData?.pdf_url || null,
        payment_instruction_url: instructionAction?.url || statusData?.pdf_url || null,
        actions,
        raw: statusData,
    };
};
const buildMidtransItemDetails = (order, products) => {
    const items = products.map((item) => ({
        id: String(item.product_id ?? item.id ?? item.productId ?? "item"),
        price: Math.round(Number(item.price ?? item.total ?? 0) || 0),
        quantity: Math.max(1, Math.round(Number(item.quantity ?? item.qty ?? 1) || 1)),
        name: String(item.name ?? item.product_name ?? item.title ?? `Produk #${item.product_id ?? item.id ?? ""}`),
    }));
    const shippingCost = Math.round(Number(order.shipping_cost ?? order.ongkir ?? 0) || 0);
    const adminFee = Math.round(Number(order.angka_unik ?? order.admin_fee ?? 0) || 0);
    if (shippingCost > 0) {
        items.push({
            id: `SHIP-${order.store_id ?? "ORDER"}`,
            price: shippingCost,
            quantity: 1,
            name: `Ongkir ${order.store_name || `Order ${order.order_id}`}`,
        });
    }
    if (adminFee > 0) {
        items.push({
            id: "ADMIN-FEE",
            price: adminFee,
            quantity: 1,
            name: "Biaya Admin Transfer",
        });
    }
    return items;
};
export const createMidtransSnapToken = async (req, res) => {
    const sourceBody = (req.body?.data && typeof req.body.data === "object" ? req.body.data : req.body) || {};
    const nestedOrder = sourceBody?.order && typeof sourceBody.order === "object" ? sourceBody.order : {};
    const rawOrderId = sourceBody?.order_id ??
        sourceBody?.orderId ??
        sourceBody?.invoice_no ??
        sourceBody?.invoiceNo ??
        nestedOrder?.order_id ??
        nestedOrder?.orderId ??
        nestedOrder?.invoice_no ??
        nestedOrder?.invoiceNo ??
        req.query.order_id ??
        req.query.invoice_no;
    const rawCustomerId = sourceBody?.customer_id ?? sourceBody?.customerId ?? nestedOrder?.customer_id ?? req.query.customer_id;
    const orderKey = String(rawOrderId || "").trim();
    if (!orderKey) {
        return errorResponse(res, "order_id atau invoice_no diperlukan", 400);
    }
    try {
        const config = await getActiveMidtransConfig();
        if (!config.server_key || !config.client_key) {
            return errorResponse(res, "Konfigurasi Midtrans aktif belum tersedia", 500);
        }
        const [orderRows] = await pool.query("SELECT order_id, invoice_no, customer_id, store_id, store_name, currency_value, shipping_cost, angka_unik, firstname, lastname, email, telephone, payment_firstname, payment_address_1, payment_address_2, payment_city, payment_postcode, payment_country, shipping_firstname, shipping_address_1, shipping_address_2, shipping_city, shipping_postcode, shipping_country, order_status_id FROM sw_order WHERE order_id = ? OR invoice_no = ? LIMIT 1", [orderKey, orderKey]);
        const order = orderRows?.[0];
        if (!order) {
            return errorResponse(res, "Order tidak ditemukan", 404);
        }
        if (rawCustomerId && String(order.customer_id || "") !== String(rawCustomerId)) {
            return errorResponse(res, "Order tidak sesuai dengan customer", 403);
        }
        const [productRows] = await pool.query("SELECT product_id, name, quantity, price, total, sku, model FROM sw_order_product WHERE order_id = ?", [order.order_id]);
        const itemDetails = buildMidtransItemDetails(order, Array.isArray(productRows) ? productRows : []);
        const grossAmount = itemDetails.reduce((sum, item) => sum + Math.round(Number(item.price) || 0) * Math.max(1, Math.round(Number(item.quantity) || 1)), 0);
        const transactionOrderId = String(order.invoice_no || order.order_id);
        const snapUrl = resolveMidtransTransactionUrl(config.environment, config.link);
        const auth = Buffer.from(`${config.server_key}:`).toString("base64");
        const transactionBody = {
            transaction_details: {
                order_id: transactionOrderId,
                gross_amount: Math.round(grossAmount),
            },
            customer_details: {
                firstname: String(order.firstname || order.shipping_firstname || ""),
                lastname: String(order.lastname || ""),
                email: String(order.email || ""),
                phone: String(order.telephone || ""),
                billing_address: {
                    first_name: String(order.payment_firstname || order.firstname || ""),
                    last_name: String(order.lastname || ""),
                    address: `${String(order.payment_address_1 || "")} ${String(order.payment_address_2 || "")}`.trim(),
                    city: String(order.payment_city || ""),
                    postal_code: String(order.payment_postcode || ""),
                    country_code: "IDN",
                },
                shipping_address: {
                    first_name: String(order.shipping_firstname || order.firstname || ""),
                    last_name: String(order.lastname || ""),
                    address: `${String(order.shipping_address_1 || "")} ${String(order.shipping_address_2 || "")}`.trim(),
                    city: String(order.shipping_city || ""),
                    postal_code: String(order.shipping_postcode || ""),
                    country_code: "IDN",
                },
            },
            item_details: itemDetails,
            callbacks: {
                finish: `${FRONTEND_BASE_URL}/payment/finish?order_id=${encodeURIComponent(String(order.order_id || ""))}&invoice_no=${encodeURIComponent(String(order.invoice_no || ""))}`,
                error: `${FRONTEND_BASE_URL}/payment/error?order_id=${encodeURIComponent(String(order.order_id || ""))}&invoice_no=${encodeURIComponent(String(order.invoice_no || ""))}`,
                pending: `${FRONTEND_BASE_URL}/profile/orders/${encodeURIComponent(String(order.order_id || ""))}`,
            },
        };
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
            const errorMessage = parsed?.error_messages || parsed?.message || `Midtrans error ${resp.status}`;
            const takenOrderId = String(errorMessage || "")
                .toLowerCase()
                .includes("order_id has already been taken");
            if (takenOrderId) {
                const existingStatus = await fetchMidtransStatus(transactionOrderId, config.server_key, config.environment);
                if (existingStatus.ok) {
                    return successResponse(res, {
                        order_id: order.order_id,
                        invoice_no: order.invoice_no,
                        transaction: transactionBody,
                        midtrans: {
                            enabled: true,
                            client_key: config.client_key,
                            environment: config.environment,
                            snap_token: null,
                            redirect_url: null,
                            existing_transaction: true,
                            status: extractMidtransPaymentInfo(existingStatus.data),
                        },
                    }, "Transaksi Midtrans existing digunakan");
                }
            }
            return errorResponse(res, errorMessage, resp.status);
        }
        return successResponse(res, {
            order_id: order.order_id,
            invoice_no: order.invoice_no,
            transaction: transactionBody,
            midtrans: {
                enabled: true,
                client_key: config.client_key,
                environment: config.environment,
                snap_token: parsed?.token || null,
                redirect_url: parsed?.redirect_url || null,
            },
        }, "Snap token berhasil dibuat");
    }
    catch (err) {
        return errorResponse(res, err.message || "Gagal membuat token Midtrans", 500);
    }
};
export const getApis = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM sw_api_midtrans WHERE status = 1");
        return successResponse(res, { apis: rows }, "APIs retrieved");
    }
    catch (err) {
        return errorResponse(res, err.message || "DB error", 500);
    }
};
export const syncMidtransStatus = async (req, res) => {
    const sourceBody = (req.body?.data && typeof req.body.data === "object" ? req.body.data : req.body) || {};
    const rawOrderId = sourceBody?.order_id ?? sourceBody?.orderId ?? sourceBody?.invoice_no ?? sourceBody?.invoiceNo ?? req.query.order_id ?? req.query.invoice_no;
    const orderKey = String(rawOrderId || "").trim();
    if (!orderKey) {
        return errorResponse(res, "order_id atau invoice_no diperlukan", 400);
    }
    try {
        const config = await getActiveMidtransConfig();
        if (!config.server_key) {
            return errorResponse(res, "Midtrans server_key not configured", 500);
        }
        const [orderRows] = await pool.query("SELECT order_id, invoice_no, order_status_id FROM sw_order WHERE order_id = ? OR invoice_no = ? LIMIT 1", [orderKey, orderKey]);
        const order = orderRows?.[0];
        if (!order) {
            return errorResponse(res, "Order tidak ditemukan", 404);
        }
        const statusResp = await fetchMidtransStatus(String(order.invoice_no || order.order_id), config.server_key, config.environment);
        if (!statusResp.ok) {
            return errorResponse(res, statusResp.data?.error_messages || statusResp.data?.status_message || `Midtrans status error ${statusResp.status}`, statusResp.status);
        }
        const txStatus = String(statusResp.data?.transaction_status || "");
        const fraudStatus = String(statusResp.data?.fraud_status || "");
        const paymentType = String(statusResp.data?.payment_type || "");
        const transactionId = String(statusResp.data?.transaction_id || "");
        const nextOrderStatusId = toOrderStatusId(txStatus, fraudStatus);
        const historyComment = buildOrderHistoryComment(txStatus, paymentType, transactionId);
        const dateAdded = new Date().toISOString().slice(0, 10);
        const currentOrderStatusId = Number(order.order_status_id || 0);
        const statusChanged = currentOrderStatusId !== Number(nextOrderStatusId);
        if (statusChanged) {
            await pool.query("UPDATE sw_order SET order_status_id = ? WHERE order_id = ?", [String(nextOrderStatusId), order.order_id]);
            await pool.query("INSERT INTO sw_order_history (order_id, order_status_id, comment, date_added) VALUES (?, ?, ?, ?)", [order.order_id, String(nextOrderStatusId), historyComment, dateAdded]);
        }
        return successResponse(res, {
            order_id: order.order_id,
            invoice_no: order.invoice_no,
            order_status_id: statusChanged ? nextOrderStatusId : currentOrderStatusId,
            transaction_status: txStatus,
            midtrans: extractMidtransPaymentInfo(statusResp.data),
        }, "Midtrans status synced");
    }
    catch (err) {
        return errorResponse(res, err.message || "Midtrans status sync failed", 500);
    }
};
export const getApisActive = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM sw_api_midtrans WHERE status = 1");
        return successResponse(res, { apis: rows }, "Active APIs retrieved");
    }
    catch (err) {
        return errorResponse(res, err.message || "DB error", 500);
    }
};
export const saveApi = async (req, res) => {
    const { jenis } = req.query;
    const data = req.body;
    if (!data)
        return errorResponse(res, "body required", 400);
    try {
        if (jenis === "mst") {
            const [result] = await pool.query("INSERT INTO sw_order SET ?", [data]);
            return successResponse(res, { insertId: result.insertId }, "Order saved (mst)");
        }
        if (jenis === "dtl") {
            const [result] = await pool.query("INSERT INTO sw_order_product SET ?", [data]);
            return successResponse(res, { insertId: result.insertId }, "Order product saved (dtl)");
        }
        if (jenis === "histori") {
            const [result] = await pool.query("INSERT INTO sw_order_history SET ?", [data]);
            return successResponse(res, { insertId: result.insertId }, "Order history saved (histori)");
        }
        return errorResponse(res, "Invalid jenis", 400);
    }
    catch (err) {
        return errorResponse(res, err.message || "DB error", 500);
    }
};
export const updateApi = async (req, res) => {
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
export const handleMidtransWebhook = async (req, res) => {
    const payload = req.body || {};
    const orderIdRaw = String(payload.order_id || "").trim();
    const statusCode = String(payload.status_code || "").trim();
    const grossAmount = String(payload.gross_amount || "").trim();
    const signatureKey = String(payload.signature_key || "").trim();
    const transactionStatus = String(payload.transaction_status || "").trim();
    const fraudStatus = String(payload.fraud_status || "").trim();
    const paymentType = String(payload.payment_type || "").trim();
    const transactionId = String(payload.transaction_id || "").trim();
    if (!orderIdRaw || !statusCode || !grossAmount || !signatureKey) {
        return errorResponse(res, "Invalid Midtrans payload", 400);
    }
    try {
        const [rows] = await pool.query("SELECT server_key FROM sw_api_midtrans WHERE status = 1 LIMIT 1");
        const serverKey = String(rows?.[0]?.server_key || "");
        if (!serverKey) {
            return errorResponse(res, "Midtrans server_key not configured", 500);
        }
        const expectedSignature = crypto.createHash("sha512").update(`${orderIdRaw}${statusCode}${grossAmount}${serverKey}`).digest("hex");
        if (expectedSignature !== signatureKey) {
            return errorResponse(res, "Invalid Midtrans signature", 401);
        }
        const invoiceNo = normalizeInvoiceNo(orderIdRaw);
        if (!invoiceNo) {
            return errorResponse(res, "Invalid order_id in Midtrans payload", 400);
        }
        const nextOrderStatusId = toOrderStatusId(transactionStatus, fraudStatus);
        const historyComment = buildOrderHistoryComment(transactionStatus, paymentType, transactionId);
        const dateAdded = new Date().toISOString().slice(0, 10);
        const [orders] = await pool.query("SELECT order_id, order_status_id, invoice_no FROM sw_order WHERE invoice_no = ?", [invoiceNo]);
        if (!orders || orders.length === 0) {
            return errorResponse(res, `Order with invoice_no ${invoiceNo} not found`, 404);
        }
        await pool.query("UPDATE sw_order SET order_status_id = ? WHERE invoice_no = ?", [String(nextOrderStatusId), invoiceNo]);
        for (const order of orders) {
            await pool.query("INSERT INTO sw_order_history (order_id, order_status_id, comment, date_added) VALUES (?, ?, ?, ?)", [order.order_id, String(nextOrderStatusId), historyComment, dateAdded]);
        }
        return successResponse(res, {
            invoice_no: invoiceNo,
            affected_orders: orders.length,
            order_status_id: nextOrderStatusId,
            transaction_status: transactionStatus,
        }, "Midtrans webhook processed", 200);
    }
    catch (err) {
        return errorResponse(res, err.message || "Midtrans webhook processing failed", 500);
    }
};
