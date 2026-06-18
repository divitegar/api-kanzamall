import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
import { validateEmail, validateRequired, validateLength } from '../helpers/validator.js';
import { sendActivationEmail, sendResetPasswordEmail } from '../helpers/email.js';

const JWT_SECRET = 'kanzamall_default_secret_key_2024';
const API_BASE_URL = (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const FRONTEND_BASE_URL = (process.env.FRONTEND_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

const hashPassword = (password: string): string => {
  return crypto.createHash('sha1').update(password).digest('hex');
};

export const adminLogin = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!validateRequired(username) || !validateRequired(password)) {
    return errorResponse(res, 'Username and password are required');
  }

  try {
    const query = `
      SELECT * 
      FROM sw_user u
      WHERE u.username = ? AND u.trash = '0'
    `;
    
    const [rows]: any = await pool.query(query, [username]);

    if (rows.length === 0) {
      return errorResponse(res, 'Invalid username or password', 401);
    }

    const user = rows[0];
    const hashedInput = hashPassword(password);

    if (hashedInput !== user.password && password !== user.password) {
      return errorResponse(res, 'Invalid username or password', 401);
    }

    const token = jwt.sign(
      { id: user.user_id, username: user.username, type: 'admin', group: user.group_name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return successResponse(res, {
      token,
      user: {
        id: user.user_id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        group: user.group_name
      }
    }, 'Login successful');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const customerLogin = async (req: Request, res: Response) => {

  const { telephone, password } = req.body;

  if (!validateRequired(telephone) || !validateRequired(password)) {
    return errorResponse(res, 'Telephone and password are required');
  }

  try {
    const query = `
      SELECT c.*, mw.name as wilayah_store
      FROM sw_customer c
      LEFT JOIN sw_store s ON c.store_id = s.store_id
      LEFT JOIN sw_mst_wilayah mw ON s.mst_wilayah_id = mw.mst_wilayah_id
      WHERE c.telephone = ?
    `;
    const [rows]: any = await pool.query(query, [telephone]);

    if (rows.length === 0) {
      return errorResponse(res, 'Invalid telephone or password', 401);
    }

    const customer = rows[0];
    const hashedInput = hashPassword(password);
    console.log(`DEBUG: customerLogin - telephone: ${telephone}, hashedInput: ${hashedInput}, storedPassword: ${customer.password}`);

    if (hashedInput !== customer.password && password !== customer.password) {
      return errorResponse(res, 'Invalid telephone or password', 401);
    }

    if (String(customer.status) !== '1') {
      return errorResponse(
        res,
        'Akun anda belum terverifikasi, silahkan lakukan verifikasi dahulu melalui email yang telah didaftarkan',
        403
      );
    }

    const token = jwt.sign(
      { 
        id: customer.customer_id, 
        email: customer.email, 
        type: 'customer',
        type_user: customer.type_user,
        leader: customer.leader,
        store_id: customer.store_id
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return successResponse(res, {
      token,
      customer: {
        customer_id: customer.customer_id,
        nama_lengkap: customer.firstname,
        email: customer.email,
        telephone: customer.telephone,
        type_user: customer.type_user,
        leader: customer.leader,
        store_id: customer.store_id,
        wilayah_store: customer.wilayah_store,
        logged_in: true
      }
    }, 'Login successful');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const customerRegister = async (req: Request, res: Response) => {
  const { firstname, lastname, email, password, confirm_password, telephone, kode_kanza, agree } = req.body;

  // 1. Validasi Input (Sesuai PHP CI4)
  if (!validateRequired(agree)) return errorResponse(res, 'Syarat dan Ketentuan Harus disetujui');
  
  if (!validateRequired(firstname) || !validateLength(firstname, 3, 50)) {
    return errorResponse(res, 'Nama Depan Harus diisi (Minimal 3 Karakter, Maximal 50 Karakter)');
  }

  if (!validateRequired(lastname) || !validateLength(lastname, 3, 50)) {
    return errorResponse(res, 'Nama Belakang Harus diisi (Minimal 3 Karakter, Maximal 50 Karakter)');
  }
  
  if (!validateRequired(email) || !validateLength(email, 6, 75) || !validateEmail(email)) {
    return errorResponse(res, 'Alamat Email Harus Valid');
  }
  
  if (!validateRequired(telephone) || !validateLength(telephone, 10, 20)) {
    return errorResponse(res, 'No Telephone Harus diisi atau sudah ada dalam data kami (Minimal 10 Karakter)');
  }
  
  if (!validateRequired(kode_kanza) || !validateLength(kode_kanza, 8, 10)) {
    return errorResponse(res, 'Kode Kanza Tidak boleh Kosong dan Harus Terdaftar dalam Database kami (Minimal 8 Karakter, Maximal 10 Karakter)');
  }
  
  if (!validateRequired(password) || !validateLength(password, 6, 200)) {
    return errorResponse(res, 'Password Harus diisi minimal 6 maksimal 200 Alphanumeric');
  }
  
  if (password !== confirm_password) {
    return errorResponse(res, 'Password Tidak Sama');
  }

  try {
    const connection = await pool.getConnection();

    try {
    // 2. Cek Unik (Email & Telephone)
    const [existing]: any = await connection.query(
      'SELECT email, telephone FROM sw_customer WHERE email = ? OR telephone = ?', 
      [email, telephone]
    );
    if (existing.length > 0) {
      if (existing.some((r: any) => r.email === email)) {
        return errorResponse(res, 'Email sudah Terdaftar dalam database kami, ganti dgn yg lain');
      }
      if (existing.some((r: any) => r.telephone === telephone)) {
        return errorResponse(res, 'No handphone sudah terdaftar dalam database kami');
      }
    }

    // 3. Cek Kode Kanza (Referal)
    const [upline]: any = await connection.query(
      `SELECT telephone
       FROM sw_customer
       WHERE kode_kanza = ? AND type_user = 1`,
      [kode_kanza]
    );

    if (upline.length === 0) {
      return errorResponse(res, 'Link Tidak ditemukan, Masukan Kode link yang valid');
    }

    const hp_distributor = upline[0].telephone;
    const activasi_key = crypto.randomBytes(8).toString('hex'); // 16 chars hex
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';

    // 4. Generate Kode Kanza Baru (Awal)
    let kode_kanza_new = firstname.replace(/\s+/g, '').substring(0, 2).toUpperCase();
    kode_kanza_new += new Date().getFullYear().toString().substr(-2);

    const hashedPassword = hashPassword(password);
    await connection.beginTransaction();

    // 5. Simpan Customer
    const [result]: any = await connection.query(
      `INSERT INTO sw_customer 
      (firstname, lastname, email, telephone, hp_distributor, password, code, status, aktif, date_added, ip, kode_kanza, type_user) 
      VALUES (?, ?, ?, ?, ?, ?, ?, '0', '0', CURDATE(), ?, ?, '0')`,
      [firstname, lastname, email, telephone, hp_distributor, hashedPassword, activasi_key, ip, kode_kanza_new]
    );

    const customer_id = result.insertId;

    // 6. Update Kode Kanza Lengkap
    // Format: KA24 + 5 digit ID (KA2400001)
    const final_kode_kanza = kode_kanza_new + (1000000 + customer_id).toString().substring(3, 8);

    await connection.query('UPDATE sw_customer SET kode_kanza = ? WHERE customer_id = ?', [final_kode_kanza, customer_id]);

    const activationLink = `${FRONTEND_BASE_URL}/login?customer_id=${customer_id}&key=${activasi_key}`;
    await sendActivationEmail(String(email), `${String(firstname)} ${String(lastname)}`.trim(), activationLink);

    await connection.commit();

    // 7. Response
    return successResponse(res, {
      customer_id,
      kode_kanza: final_kode_kanza,
      activasi_link: activationLink
    }, 'Registration successful', 201);
    } catch (txError: any) {
      await connection.rollback();
      return errorResponse(res, txError.message || 'Registration failed', 500);
    } finally {
      connection.release();
    }
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const verifyCustomer = async (req: Request, res: Response) => {

  const customer_id = Number(req.query.customer_id);
  const key = String(req.query.key);

  if (!customer_id || Number.isNaN(customer_id)) {
    return errorResponse(res, 'customer_id is required', 400);
  }

  if (!key) {
    return errorResponse(res, 'key is required', 400);
  }

  try {
    const [rows]: any = await pool.query(
      'SELECT customer_id, code, status, aktif FROM sw_customer WHERE customer_id = ? LIMIT 1',
      [customer_id]
    );

    if (!rows || rows.length === 0) {
      return errorResponse(res, 'Customer not found', 404);
    }

    const customer = rows[0];

    if (String(customer.status) === '1') {
      return successResponse(res, { customer_id, status: 1, aktif: 0 }, 'Akun sudah terverifikasi');
    }

    if (String(customer.code) !== key) {
      return errorResponse(res, 'Link aktivasi tidak valid', 400);
    }

    await pool.query(
      "UPDATE sw_customer SET status = '1', aktif = '0' WHERE customer_id = ? AND code = ?",
      [customer_id, key]
    );

    return successResponse(
      res,
      { customer_id, status: 1, aktif: 0 },
      'Verifikasi berhasil'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const customerResendVerificationLink = async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').trim();

  if (!validateRequired(email) || !validateEmail(email)) {
    return errorResponse(res, 'Alamat Email Harus Valid', 400);
  }

  try {
    const [rows]: any = await pool.query(
      'SELECT customer_id, firstname, lastname, email, status FROM sw_customer WHERE email = ? LIMIT 1',
      [email]
    );

    // Do not disclose whether an email exists.
    if (!rows || rows.length === 0) {
      return successResponse(
        res,
        null,
        'Jika email terdaftar, link verifikasi akan dikirim ke email Anda'
      );
    }

    const customer = rows[0];

    if (String(customer.status) === '1') {
      return successResponse(
        res,
        { customer_id: customer.customer_id, status: 1 },
        'Akun sudah terverifikasi'
      );
    }

    const activationKey = crypto.randomBytes(8).toString('hex');
    await pool.query('UPDATE sw_customer SET code = ? WHERE customer_id = ?', [activationKey, customer.customer_id]);

    const activationLink = `${FRONTEND_BASE_URL}/login?customer_id=${customer.customer_id}&key=${activationKey}`;
    await sendActivationEmail(
      String(customer.email),
      `${String(customer.firstname ?? '')} ${String(customer.lastname ?? '')}`.trim(),
      activationLink
    );

    return successResponse(
      res,
      { customer_id: customer.customer_id, activation_link: activationLink },
      'Jika email terdaftar, link verifikasi akan dikirim ke email Anda'
    );
  } catch (error: any) {
    return errorResponse(res, error.message || 'Resend verification link failed', 500);
  }
};

export const customerResendResetPasswordLink = async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').trim();

  if (!validateRequired(email) || !validateEmail(email)) {
    return errorResponse(res, 'Alamat Email Harus Valid', 400);
  }

  try {
    const [rows]: any = await pool.query(
      'SELECT customer_id, firstname, lastname, email FROM sw_customer WHERE email = ? LIMIT 1',
      [email]
    );

    // Do not disclose whether an email exists.
    if (!rows || rows.length === 0) {
      return successResponse(
        res,
        null,
        'Jika email terdaftar, link reset password akan dikirim ke email Anda'
      );
    }

    const customer = rows[0];
    const resetKey = crypto.randomBytes(16).toString('hex');

    await pool.query('UPDATE sw_customer SET code = ? WHERE customer_id = ?', [resetKey, customer.customer_id]);

    const resetLink = `${FRONTEND_BASE_URL}/reset-password?customer_id=${customer.customer_id}&key=${resetKey}`;
    await sendResetPasswordEmail(
      String(customer.email),
      `${String(customer.firstname ?? '')} ${String(customer.lastname ?? '')}`.trim(),
      resetLink
    );

    return successResponse(
      res,
      { customer_id: customer.customer_id, reset_link: resetLink },
      'Jika email terdaftar, link reset password akan dikirim ke email Anda'
    );
  } catch (error: any) {
    return errorResponse(res, error.message || 'Resend reset password link failed', 500);
  }
};

export const customerForgotPassword = async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').trim();

  if (!validateRequired(email) || !validateEmail(email)) {
    return errorResponse(res, 'Alamat Email Harus Valid', 400);
  }

  try {
    const [rows]: any = await pool.query(
      'SELECT customer_id, firstname, lastname, email FROM sw_customer WHERE email = ? LIMIT 1',
      [email]
    );

    // Do not disclose whether an email exists.
    if (!rows || rows.length === 0) {
      return successResponse(
        res,
        null,
        'Jika email terdaftar, link reset password akan dikirim ke email Anda'
      );
    }

    const customer = rows[0];
    const resetKey = crypto.randomBytes(16).toString('hex');

    await pool.query('UPDATE sw_customer SET code = ? WHERE customer_id = ?', [resetKey, customer.customer_id]);

    const resetLink = `${FRONTEND_BASE_URL}/reset-password?customer_id=${customer.customer_id}&key=${resetKey}`;
    await sendResetPasswordEmail(
      String(customer.email),
      `${String(customer.firstname ?? '')} ${String(customer.lastname ?? '')}`.trim(),
      resetLink
    );

    return successResponse(
      res,
      { customer_id: customer.customer_id, reset_link: resetLink },
      'Jika email terdaftar, link reset password akan dikirim ke email Anda'
    );
  } catch (error: any) {
    return errorResponse(res, error.message || 'Forgot password failed', 500);
  }
};

export const validateCustomerResetPasswordToken = async (req: Request, res: Response) => {
  const customer_id = Number(req.query.customer_id ?? req.body.customer_id ?? req.params.customer_id);
  const key = String(req.query.key ?? req.body.key ?? req.params.key ?? '').trim();

  if (!customer_id || Number.isNaN(customer_id)) {
    return errorResponse(res, 'customer_id is required', 400);
  }

  if (!key) {
    return errorResponse(res, 'key is required', 400);
  }

  try {
    const [rows]: any = await pool.query(
      'SELECT customer_id FROM sw_customer WHERE customer_id = ? AND code = ? LIMIT 1',
      [customer_id, key]
    );

    if (!rows || rows.length === 0) {
      return errorResponse(res, 'Link reset password tidak valid', 400);
    }

    return successResponse(res, { customer_id }, 'Token reset password valid');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Reset token validation failed', 500);
  }
};

export const customerResetPassword = async (req: Request, res: Response) => {
  const customer_id = Number(req.body?.customer_id ?? req.query.customer_id ?? req.params.customer_id);
  const key = String(req.body?.key ?? req.query.key ?? req.params.key ?? '').trim();
  const password = String(req.body?.password ?? '');
  const confirm_password = String(req.body?.confirm_password ?? '');

  if (!customer_id || Number.isNaN(customer_id)) {
    return errorResponse(res, 'customer_id is required', 400);
  }

  if (!key) {
    return errorResponse(res, 'key is required', 400);
  }

  if (!validateRequired(password) || !validateLength(password, 6, 200)) {
    return errorResponse(res, 'Password Harus diisi minimal 6 maksimal 200 Alphanumeric', 400);
  }

  if (password !== confirm_password) {
    return errorResponse(res, 'Password Tidak Sama', 400);
  }

  try {
    const [rows]: any = await pool.query(
      'SELECT customer_id FROM sw_customer WHERE customer_id = ? AND code = ? LIMIT 1',
      [customer_id, key]
    );

    if (!rows || rows.length === 0) {
      return errorResponse(res, 'Link reset password tidak valid', 400);
    }

    const newHashedPassword = hashPassword(password);
    const newOneTimeCode = crypto.randomBytes(16).toString('hex');

    await pool.query(
      'UPDATE sw_customer SET password = ?, code = ? WHERE customer_id = ? AND code = ?',
      [newHashedPassword, newOneTimeCode, customer_id, key]
    );

    return successResponse(res, { customer_id }, 'Password berhasil diubah');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Reset password failed', 500);
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  const customer_id = String(req.params.customer_id ?? req.params.id ?? req.query.customer_id ?? '').trim();

  if (!customer_id) {
    return errorResponse(res, 'customer_id is required', 400);
  }

  try {
    const query = `
      SELECT c.*, mw.name as wilayah_store
      FROM sw_customer c
      LEFT JOIN sw_store s ON c.store_id = s.store_id
      LEFT JOIN sw_mst_wilayah mw ON s.mst_wilayah_id = mw.mst_wilayah_id
      WHERE c.customer_id = ?
      LIMIT 1
    `;

    const [rows]: any = await pool.query(query, [customer_id]);

    if (!rows || rows.length === 0) {
      return errorResponse(res, 'Customer not found', 404);
    }

    return successResponse(res, { customer: rows[0] }, 'Customer retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const customerUpdate = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  let tokenCustomerId: number | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id?: number | string };
        const parsed = Number(decoded?.id);
        if (!Number.isNaN(parsed)) {
          tokenCustomerId = parsed;
        }
      } catch {
        // Ignore token parse failures; fallback to request payload.
      }
    }
  }

  const rawCustomerId = req.body?.customer_id ?? req.query.customer_id ?? tokenCustomerId;
  const customer_id = Number(rawCustomerId);

  if (Number.isNaN(customer_id) || customer_id <= 0) {
    return errorResponse(res, 'customer_id is required', 400);
  }

  const allowedFields = [
    'firstname',
    'lastname',
    'email',
    'telephone',
    'store_id',
    'no_rek',
    'nama_rek',
    'nama_bank',
    'nik',
    'kk',
    'image'
  ];

  const sourceBody: Record<string, any> =
    req.body && typeof req.body.data === 'object' && req.body.data !== null
      ? req.body.data
      : (req.body || {});

  // Legacy compatibility: some clients send order_id when they mean store_id.
  if (
    !Object.prototype.hasOwnProperty.call(sourceBody, 'store_id')
    && Object.prototype.hasOwnProperty.call(sourceBody, 'order_id')
  ) {
    sourceBody.store_id = sourceBody.order_id;
  }

  const uploadedFile = (req as Request & { file?: { filename?: string } }).file;
  if (uploadedFile?.filename) {
    sourceBody.image = uploadedFile.filename;
  }

  const dataToUpdate: Record<string, any> = {};
  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(sourceBody, key)) {
      dataToUpdate[key] = sourceBody[key];
    }
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return errorResponse(
      res,
      'No valid fields to update. Allowed: firstname, lastname, email, telephone, store_id, no_rek, nama_rek, nama_bank, nik, kk, image',
      400
    );
  }

  if (dataToUpdate.email && !validateEmail(String(dataToUpdate.email))) {
    return errorResponse(res, 'Alamat Email Harus Valid', 400);
  }

  try {
    // Ensure customer exists.
    const [exists]: any = await pool.query(
      'SELECT customer_id FROM sw_customer WHERE customer_id = ? LIMIT 1',
      [customer_id]
    );

    if (!exists || exists.length === 0) {
      return errorResponse(res, 'Customer not found', 404);
    }

    // Enforce unique email and telephone against other customers.
    if (dataToUpdate.email) {
      const [dupEmail]: any = await pool.query(
        'SELECT customer_id FROM sw_customer WHERE email = ? AND customer_id <> ? LIMIT 1',
        [dataToUpdate.email, customer_id]
      );
      if (dupEmail.length > 0) {
        return errorResponse(res, 'Email sudah Terdaftar dalam database kami, ganti dgn yg lain', 400);
      }
    }

    if (dataToUpdate.telephone) {
      const [dupPhone]: any = await pool.query(
        'SELECT customer_id FROM sw_customer WHERE telephone = ? AND customer_id <> ? LIMIT 1',
        [dataToUpdate.telephone, customer_id]
      );
      if (dupPhone.length > 0) {
        return errorResponse(res, 'No handphone sudah terdaftar dalam database kami', 400);
      }
    }

    const keys = Object.keys(dataToUpdate);
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const params = keys.map((k) => dataToUpdate[k]);
    params.push(customer_id);

    const [result]: any = await pool.query(
      `UPDATE sw_customer SET ${setClause} WHERE customer_id = ?`,
      params
    );

    return successResponse(
      res,
      {
        customer_id,
        affectedRows: result.affectedRows
      },
      'Customer updated successfully'
    );
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};
