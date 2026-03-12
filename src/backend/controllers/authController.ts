import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
import { validateEmail, validateRequired, validateLength } from '../helpers/validator.js';

const JWT_SECRET = 'kanzamall_default_secret_key_2024';

const hashPassword = (password: string): string => {
  return crypto.createHash('sha1').update(password).digest('hex');
};

// Helper function to check kode_kanza (Ported from PHP)
const cek_kode_kanza_internal = async (kode_kanza: string) => {
  const query = `
    SELECT telephone 
    FROM sw_customer 
    WHERE kode_kanza = ? AND type_user = 1
  `;
  const [rows]: any = await pool.query(query, [kode_kanza]);
  return rows;
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
      WHERE c.telephone = ? AND c.status = 1
    `;
    const [rows]: any = await pool.query(query, [telephone]);


    if (rows.length === 0) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const customer = rows[0];
    const hashedInput = hashPassword(password);

    if (hashedInput !== customer.password && password !== customer.password) {
      return errorResponse(res, 'Invalid email or password', 401);
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
  const { name, email, password, confirm_password, telephone, kode_kanza, agree } = req.body;

  // 1. Validasi Input (Sesuai PHP CI4)
  if (!validateRequired(agree)) return errorResponse(res, 'Syarat dan Ketentuan Harus disetujui');
  
  if (!validateRequired(name) || !validateLength(name, 3, 50)) {
    return errorResponse(res, 'Nama Lengkap Harus diisi (Minimal 3 Karakter, Maximal 50 Karakter)');
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
    // 2. Cek Unik (Email & Telephone)
    const [existing]: any = await pool.query(
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
    const upline = await cek_kode_kanza_internal(kode_kanza);
    if (upline.length === 0) {
      return errorResponse(res, 'Link Tidak ditemukan, Masukan Kode link yang valid');
    }

    const hp_distributor = upline[0].telephone;
    const activasi_key = crypto.randomBytes(8).toString('hex'); // 16 chars hex
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';

    // 4. Generate Kode Kanza Baru (Awal)
    let kode_kanza_new = name.replace(/\s+/g, '').substring(0, 2).toUpperCase();
    kode_kanza_new += new Date().getFullYear().toString().substr(-2);

    const hashedPassword = hashPassword(password);

    // 5. Simpan Customer
    const [result]: any = await pool.query(
      `INSERT INTO sw_customer 
      (firstname, email, telephone, hp_distributor, password, code, status, date_added, ip, kode_kanza, type_user) 
      VALUES (?, ?, ?, ?, ?, ?, '1', CURDATE(), ?, ?, '2')`,
      [name, email, telephone, hp_distributor, hashedPassword, activasi_key, ip, kode_kanza_new]
    );

    const customer_id = result.insertId;

    // 6. Update Kode Kanza Lengkap
    // Format: KA24 + 5 digit ID (KA2400001)
    const final_kode_kanza = kode_kanza_new + (1000000 + customer_id).toString().substring(3, 8);

    await pool.query('UPDATE sw_customer SET kode_kanza = ? WHERE customer_id = ?', [final_kode_kanza, customer_id]);

    // 7. Response
    return successResponse(res, {
      customer_id,
      kode_kanza: final_kode_kanza,
      activasi_link: `https://kanzamall.com/akun/aktivasi?customer_id=${customer_id}&key=${activasi_key}`
    }, 'Registration successful', 201);

  } catch (error: any) {
    return errorResponse(res, error.message, 500);
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
