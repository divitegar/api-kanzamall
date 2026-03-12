import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Database, Server, ArrowRight, Code2, LogIn, UserPlus, LogOut, ShieldCheck, Terminal } from 'lucide-react';
import ApiTester from './components/ApiTester';

interface User {
  id: number;
  username?: string;
  email?: string;
  firstname: string;
  lastname: string;
  type: 'admin' | 'customer';
}

const API_LIST = [
  {
    name: "Seed Admin",
    method: "POST",
    path: "/api/auth/seed-admin",
    description: "Membuat akun admin default (admin/admin123) untuk keperluan testing.",
    body: null
  },
  {
    name: "Customer Register",
    method: "POST",
    path: "/api/auth/customer/register",
    description: "Registrasi customer baru. Memerlukan kode_kanza referal yang valid.",
    body: {
      name: "Budi Santoso",
      email: "budi@example.com",
      telephone: "081234567890",
      password: "password123",
      confirm_password: "password123",
      kode_kanza: "KA2400001",
      agree: true
    }
  },
  {
    name: "Customer Login",
    method: "POST",
    path: "/api/auth/customer/login",
    description: "Login untuk customer menggunakan No HP atau Email.",
    body: {
      telephone: "081234567890",
      password: "password123"
    }
  },
  {
    name: "Admin Login",
    method: "POST",
    path: "/api/auth/admin/login",
    description: "Login khusus admin menggunakan username.",
    body: {
      username: "admin",
      password: "admin123"
    }
  },
  {
    name: "Get Slideshows",
    method: "GET",
    path: "/api/slideshow",
    description: "Mengambil daftar slideshow yang aktif (published=1).",
    body: null
  },
  {
    name: "Get Products",
    method: "GET",
    path: "/api/products",
    description: "Mengambil daftar produk dengan filter opsional (category_id, jenis, limit).",
    body: null
  },
  {
    name: "Product Deals",
    method: "GET",
    path: "/api/products/deals",
    description: "Mengambil daftar produk promo/deal.",
    body: null
  },
  {
    name: "Search Products",
    method: "GET",
    path: "/api/products/search?q=sabun",
    description: "Mencari produk berdasarkan nama.",
    body: null
  },
  {
    name: "Get Products by Category",
    method: "GET",
    path: "/api/products/category/1",
    description: "Mengambil daftar produk berdasarkan ID kategori.",
    body: null
  },
  {
    name: "Get All Stores",
    method: "GET",
    path: "/api/stores",
    description: "Mengambil daftar toko pusat (jenis=1).",
    body: null
  },
  {
    name: "Check Wilayah Store",
    method: "GET",
    path: "/api/stores/check-wilayah?city_id=1",
    description: "Mengecek wilayah toko berdasarkan ID kota.",
    body: null
  },
  {
    name: "Change Store List",
    method: "GET",
    path: "/api/stores/change",
    description: "Mengambil daftar toko yang aktif untuk diganti.",
    body: null
  },
  {
    name: "Find Store by ID",
    method: "GET",
    path: "/api/stores/1",
    description: "Mencari detail toko berdasarkan ID.",
    body: null
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'none'>('none');
  const [loginType, setLoginType] = useState<'admin' | 'customer'>('customer');
  const [activeApi, setActiveApi] = useState<number | null>(null);
  
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    name: '',
    telephone: '',
    kode_kanza: '',
    agree: false
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'register' 
      ? '/api/auth/customer/register' 
      : (loginType === 'admin' ? '/api/auth/admin/login' : '/api/auth/customer/login');
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      
      if (res.ok) {
        if (authMode === 'register') {
          alert('Registrasi berhasil! Kode Kanza Anda: ' + data.kode_kanza);
          setAuthMode('login');
        } else {
          const loggedUser = {
            ... (data.user || data.customer),
            type: loginType
          };
          setUser(loggedUser);
          localStorage.setItem('user', JSON.stringify(loggedUser));
          localStorage.setItem('token', data.token);
          setAuthMode('none');
        }
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Gagal menghubungi server');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const seedAdmin = async () => {
    if (!confirm('Buat akun admin percobaan (user: admin, pass: admin123)?')) return;
    try {
      const res = await fetch('/api/auth/seed-admin', { method: 'POST' });
      const data = await res.json();
      alert(data.message || data.error);
    } catch (err) {
      alert('Gagal menghubungi server');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        {/* Navbar */}
        <nav className="flex justify-between items-center mb-12 bg-white p-4 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
              <Server size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight">KanzaMall API</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold">{user.firstname} {user.lastname}</p>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold">{user.type}</p>
                </div>
                <button onClick={logout} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setAuthMode('login')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-stone-600 hover:bg-stone-50 rounded-xl transition-all">
                  <LogIn size={18} /> Login
                </button>
                <button onClick={() => setAuthMode('register')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm">
                  <UserPlus size={18} /> Register
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Auth Modals */}
        <AnimatePresence>
          {authMode !== 'none' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-stone-200">
                <div className="p-8 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold capitalize">{authMode} {authMode === 'login' ? loginType : 'Customer'}</h2>
                    <button onClick={() => setAuthMode('none')} className="text-stone-400 hover:text-stone-600">✕</button>
                  </div>

                  {authMode === 'login' && (
                    <div className="flex p-1 bg-stone-100 rounded-xl mb-6">
                      <button onClick={() => setLoginType('customer')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginType === 'customer' ? 'bg-white shadow-sm text-emerald-600' : 'text-stone-500'}`}>Customer</button>
                      <button onClick={() => setLoginType('admin')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginType === 'admin' ? 'bg-white shadow-sm text-emerald-600' : 'text-stone-500'}`}>Admin</button>
                    </div>
                  )}

                  <form onSubmit={handleAuth} className="space-y-4">
                    {authMode === 'register' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Nama Lengkap</label>
                          <input type="text" required className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">No Telephone (Username)</label>
                          <input type="text" required className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" value={authForm.telephone} onChange={e => setAuthForm({...authForm, telephone: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Email</label>
                          <input type="email" required className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Kode Kanza (Referal)</label>
                          <input type="text" required className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" value={authForm.kode_kanza} onChange={e => setAuthForm({...authForm, kode_kanza: e.target.value})} />
                        </div>
                      </>
                    )}

                    {authMode === 'login' && loginType === 'admin' ? (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Username</label>
                        <input type="text" required className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
                      </div>
                    ) : authMode === 'login' && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">No Telephone / Email</label>
                        <input type="text" required className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" value={authForm.telephone} onChange={e => setAuthForm({...authForm, telephone: e.target.value})} />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Password</label>
                      <input type="password" required className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                    </div>

                    {authMode === 'register' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Konfirmasi Password</label>
                          <input type="password" required className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" value={authForm.confirm_password} onChange={e => setAuthForm({...authForm, confirm_password: e.target.value})} />
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="agree" checked={authForm.agree} onChange={e => setAuthForm({...authForm, agree: e.target.checked})} />
                          <label htmlFor="agree" className="text-xs text-stone-500">Saya setuju dengan Syarat dan Ketentuan</label>
                        </div>
                      </>
                    )}

                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all mt-4">
                      {authMode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">KanzaMall API Docs</h1>
          </div>
          <p className="text-lg text-stone-600 max-w-2xl">Dokumentasi endpoint API migrasi KanzaMall. Gunakan daftar di bawah untuk testing via Postman atau UI.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar / Tools */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                <Database size={16} className="text-emerald-600" /> Database Tools
              </h3>
              <button onClick={seedAdmin} className="w-full py-3 bg-stone-50 border border-stone-200 text-stone-700 text-xs font-bold rounded-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all flex items-center justify-center gap-2">
                <Plus size={14} /> Seed Admin Account
              </button>
              <p className="text-[10px] text-stone-400 mt-3 text-center">Membuat user 'admin' dengan password 'admin123'</p>
            </div>

            <div className="p-6 bg-emerald-900 text-white rounded-3xl shadow-xl shadow-emerald-900/20">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <Code2 size={16} /> Base URL
              </h3>
              <div className="bg-emerald-800/50 p-3 rounded-xl font-mono text-[10px] break-all border border-emerald-700/50">
                {window.location.origin}
              </div>
              <p className="text-[10px] text-emerald-300 mt-3">Gunakan URL ini sebagai root di Postman Anda.</p>
            </div>
          </div>

          {/* Main Content: API List */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-xl font-bold px-2 mb-2">Endpoint List</h2>
            {API_LIST.map((api, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden transition-all hover:border-emerald-200">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-50"
                  onClick={() => setActiveApi(activeApi === idx ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${api.method === 'POST' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {api.method}
                    </span>
                    <span className="font-mono text-sm font-bold text-stone-700">{api.path}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 font-medium hidden sm:block">{api.name}</span>
                    <ArrowRight size={16} className={`text-stone-300 transition-transform ${activeApi === idx ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                <AnimatePresence>
                  {activeApi === idx && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-stone-100 bg-stone-50/50"
                    >
                      <div className="p-6 space-y-4">
                        <p className="text-sm text-stone-600">{api.description}</p>
                        
                        {api.body && (
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Request Body (JSON)</label>
                            <pre className="bg-stone-900 text-emerald-400 p-4 rounded-xl text-xs overflow-x-auto font-mono">
                              {JSON.stringify(api.body, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {!api.body && (
                          <div className="text-xs text-stone-400 italic">No request body required.</div>
                        )}

                        <ApiTester 
                          method={api.method} 
                          path={api.path} 
                          defaultBody={api.body} 
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
