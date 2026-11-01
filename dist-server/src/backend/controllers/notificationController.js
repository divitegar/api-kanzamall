import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/apiResponse.js";
let ensureTablePromise = null;
const SHIPPING_STATUS_REGEX = /(kirim|shipping|shipment|delivery|dalam perjalanan|sampai|diterima|pickup|resi)/i;
const COMPLETED_STATUS_REGEX = /(selesai|complete|completed|success|berhasil)/i;
const toCustomerId = (req) => {
    const raw = req.query.customer_id ?? req.body?.customer_id ?? req.params.customer_id;
    const customerId = Number(raw);
    return Number.isFinite(customerId) && customerId > 0 ? customerId : 0;
};
const ensureNotificationReadTable = async () => {
    if (!ensureTablePromise) {
        ensureTablePromise = (async () => {
            await pool.query(`
        CREATE TABLE IF NOT EXISTS sw_customer_notification_reads (
          customer_id BIGINT NOT NULL,
          notification_key VARCHAR(191) NOT NULL,
          read_at DATETIME NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (customer_id, notification_key),
          KEY idx_sw_customer_notification_reads_read_at (read_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
        })().catch((error) => {
            ensureTablePromise = null;
            throw error;
        });
    }
    await ensureTablePromise;
};
const toIsoString = (value) => {
    if (!value)
        return new Date().toISOString();
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return new Date().toISOString();
    return date.toISOString();
};
const buildOrderNotification = (row) => {
    const statusName = String(row?.status_name || "Update Pesanan").trim();
    const comment = String(row?.comment || "").trim();
    const createdAt = toIsoString(row?.date_added);
    const invoiceNo = String(row?.invoice_no || row?.order_id || "-").trim();
    const isShipping = SHIPPING_STATUS_REGEX.test(statusName) || SHIPPING_STATUS_REGEX.test(comment);
    const isCompleted = COMPLETED_STATUS_REGEX.test(statusName) || COMPLETED_STATUS_REGEX.test(comment);
    const type = isShipping ? "shipping" : isCompleted ? "review" : "transaction";
    let title = `Status pesanan ${statusName}`;
    if (type === "shipping")
        title = `Pesanan ${statusName}`;
    if (type === "review")
        title = `Pesanan ${statusName}`;
    const description = comment || `Order ${invoiceNo} saat ini berstatus ${statusName}.`;
    const historyId = Number(row?.order_history_id || 0) || `${row?.order_id || 0}-${row?.order_status_id || 0}-${createdAt}`;
    return {
        id: `order-history:${historyId}`,
        type,
        title,
        description,
        created_at: createdAt,
        is_read: false,
        action_url: `/profile/orders/${encodeURIComponent(String(row?.order_id || ""))}`,
        metadata: {
            order_id: Number(row?.order_id || 0) || 0,
            order_status_id: row?.order_status_id !== undefined && row?.order_status_id !== null ? Number(row.order_status_id) : null,
            invoice_no: invoiceNo,
            status_name: statusName,
        },
    };
};
const buildRewardNotification = (row) => {
    const createdAt = toIsoString(row?.tanggal);
    const points = Number(row?.reward || 0) || 0;
    const invoiceNo = row?.invoice_no ? String(row.invoice_no) : null;
    const orderId = row?.order_id ? Number(row.order_id) || 0 : 0;
    const rewardIdPart = orderId > 0 ? String(orderId) : invoiceNo || createdAt;
    return {
        id: `reward:${rewardIdPart}`,
        type: "point",
        title: "Point Kanza Masuk",
        description: invoiceNo ? `Anda mendapatkan ${points.toLocaleString("id-ID")} point dari transaksi ${invoiceNo}.` : `Anda mendapatkan ${points.toLocaleString("id-ID")} point dari transaksi Anda.`,
        created_at: createdAt,
        is_read: false,
        action_url: "/profile/points/history",
        metadata: {
            order_id: orderId || null,
            invoice_no: invoiceNo,
            jumlah_point: points,
        },
    };
};
const getNotificationsForCustomer = async (customerId) => {
    await ensureNotificationReadTable();
    const [orderRows] = await pool.query(`
      SELECT
        h.order_history_id,
        h.order_id,
        h.order_status_id,
        h.comment,
        h.date_added,
        s.name AS status_name,
        o.invoice_no
      FROM sw_order_history h
      INNER JOIN sw_order o ON o.order_id = h.order_id
      LEFT JOIN sw_order_status s ON s.order_status_id = h.order_status_id
      WHERE o.customer_id = ?
      ORDER BY h.date_added DESC
      LIMIT 50
    `, [customerId]);
    const [rewardRows] = await pool.query(`
      SELECT
        order_id,
        invoice_no,
        reward,
        tanggal
      FROM sw_customer_reward_dtl
      WHERE customer_id = ?
      ORDER BY tanggal DESC
      LIMIT 20
    `, [customerId]);
    const notifications = [...(Array.isArray(orderRows) ? orderRows.map(buildOrderNotification) : []), ...(Array.isArray(rewardRows) ? rewardRows.map(buildRewardNotification) : [])]
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
        .slice(0, 100);
    if (notifications.length === 0) {
        return {
            notifications,
            unreadCount: 0,
        };
    }
    const notificationKeys = notifications.map((item) => item.id);
    const placeholders = notificationKeys.map(() => "?").join(", ");
    const [readRows] = await pool.query(`
      SELECT notification_key
      FROM sw_customer_notification_reads
      WHERE customer_id = ?
      AND notification_key IN (${placeholders})
    `, [customerId, ...notificationKeys]);
    const readSet = new Set((Array.isArray(readRows) ? readRows : []).map((row) => String(row?.notification_key || "").trim()).filter(Boolean));
    let unreadCount = 0;
    const normalizedNotifications = notifications.map((item) => {
        const isRead = readSet.has(item.id);
        if (!isRead)
            unreadCount += 1;
        return {
            ...item,
            is_read: isRead,
        };
    });
    return {
        notifications: normalizedNotifications,
        unreadCount,
    };
};
export const getNotifications = async (req, res) => {
    const customerId = toCustomerId(req);
    if (!customerId)
        return errorResponse(res, "customer_id is required", 400);
    try {
        const { notifications, unreadCount } = await getNotificationsForCustomer(customerId);
        return successResponse(res, { notifications, unread_count: unreadCount }, "Notifications retrieved");
    }
    catch (error) {
        return errorResponse(res, error?.message || "Failed to retrieve notifications", 500);
    }
};
export const getUnreadNotificationCount = async (req, res) => {
    const customerId = toCustomerId(req);
    if (!customerId)
        return errorResponse(res, "customer_id is required", 400);
    try {
        const { unreadCount } = await getNotificationsForCustomer(customerId);
        return successResponse(res, { unread_count: unreadCount }, "Unread notification count retrieved");
    }
    catch (error) {
        return errorResponse(res, error?.message || "Failed to retrieve unread notification count", 500);
    }
};
export const markNotificationRead = async (req, res) => {
    const customerId = toCustomerId(req);
    const notificationId = decodeURIComponent(String(req.params.notification_id || "")).trim();
    if (!customerId)
        return errorResponse(res, "customer_id is required", 400);
    if (!notificationId)
        return errorResponse(res, "notification_id is required", 400);
    try {
        await ensureNotificationReadTable();
        await pool.query(`
        INSERT INTO sw_customer_notification_reads (customer_id, notification_key, read_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE read_at = VALUES(read_at), updated_at = CURRENT_TIMESTAMP
      `, [customerId, notificationId]);
        return successResponse(res, { notification_id: notificationId }, "Notification marked as read");
    }
    catch (error) {
        return errorResponse(res, error?.message || "Failed to mark notification as read", 500);
    }
};
export const markAllNotificationsRead = async (req, res) => {
    const customerId = toCustomerId(req);
    if (!customerId)
        return errorResponse(res, "customer_id is required", 400);
    try {
        const { notifications } = await getNotificationsForCustomer(customerId);
        if (notifications.length === 0) {
            return successResponse(res, { affected: 0 }, "No notifications to mark as read");
        }
        const unreadNotifications = notifications.filter((item) => !item.is_read);
        if (unreadNotifications.length === 0) {
            return successResponse(res, { affected: 0 }, "All notifications already read");
        }
        await ensureNotificationReadTable();
        const values = unreadNotifications.map((item) => [customerId, item.id]);
        await pool.query(`
        INSERT INTO sw_customer_notification_reads (customer_id, notification_key, read_at)
        VALUES ?
        ON DUPLICATE KEY UPDATE read_at = VALUES(read_at), updated_at = CURRENT_TIMESTAMP
      `, [values.map(([custId, notificationKey]) => [custId, notificationKey, new Date()])]);
        return successResponse(res, { affected: unreadNotifications.length }, "All notifications marked as read");
    }
    catch (error) {
        return errorResponse(res, error?.message || "Failed to mark all notifications as read", 500);
    }
};
