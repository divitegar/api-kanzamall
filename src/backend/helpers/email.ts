import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || 'official@kanzamall.com';
const SMTP_PASS = process.env.SMTP_PASS || 'Kanzamall2026!';
const SMTP_FROM = process.env.SMTP_FROM || 'official@kanzamall.com';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
});

transporter.verify((error) => {
  if (error) {
    console.error('[SMTP] Connection error:', error.message);
  } else {
    console.log('[SMTP] Server is ready to send emails');
  }
});

export const sendActivationEmail = async (toEmail: string, fullName: string, activationLink: string): Promise<void> => {
  await transporter.sendMail({
    from: `"KanzaMall Official" <${SMTP_FROM}>`,
    to: toEmail,
    subject: 'Aktivasi Akun KanzaMall',
    text: `Halo ${fullName},\n\nTerima kasih sudah registrasi. Klik link berikut untuk verifikasi akun Anda:\n${activationLink}\n\nJika Anda tidak merasa melakukan registrasi, abaikan email ini.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2 style="margin-bottom: 8px;">Aktivasi Akun KanzaMall</h2>
        <p>Halo <strong>${fullName}</strong>,</p>
        <p>Terima kasih sudah registrasi. Klik tombol di bawah untuk verifikasi akun Anda:</p>
        <p style="margin: 24px 0;">
          <a href="${activationLink}" style="background:#0f766e;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block;">Verifikasi Akun</a>
        </p>
        <p>Atau buka link berikut secara manual:</p>
        <p><a href="${activationLink}">${activationLink}</a></p>
        <p>Jika Anda tidak merasa melakukan registrasi, abaikan email ini.</p>
      </div>
    `,
  });
};

export const sendResetPasswordEmail = async (toEmail: string, fullName: string, resetLink: string): Promise<void> => {
  await transporter.sendMail({
    from: `"KanzaMall Official" <${SMTP_FROM}>`,
    to: toEmail,
    subject: 'Reset Password KanzaMall',
    text: `Halo ${fullName},\n\nKami menerima permintaan reset password. Klik link berikut untuk membuat password baru:\n${resetLink}\n\nJika Anda tidak melakukan permintaan ini, abaikan email ini.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2 style="margin-bottom: 8px;">Reset Password KanzaMall</h2>
        <p>Halo <strong>${fullName}</strong>,</p>
        <p>Kami menerima permintaan reset password. Klik tombol di bawah untuk membuat password baru:</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}" style="background:#0f766e;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block;">Reset Password</a>
        </p>
        <p>Atau buka link berikut secara manual:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Jika Anda tidak melakukan permintaan ini, abaikan email ini.</p>
      </div>
    `,
  });
};
