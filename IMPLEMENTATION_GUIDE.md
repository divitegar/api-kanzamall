# Implementasi Frontend Multi-Store Checkout + Midtrans

## 📦 File yang Dibuat

1. **src/types/checkout.ts** - Type definitions (copy-paste siap pakai)
2. **src/services/checkout.ts** - Business logic helpers (grouping, validasi, API)
3. **src/utils/midtrans.ts** - Midtrans Snap integration utilities
4. **src/components/CheckoutMultiStore.tsx** - React component lengkap

---

## 🚀 Quick Start

### 1. Import komponen di halaman checkout Anda

```typescript
import CheckoutMultiStore from '@/components/CheckoutMultiStore';

export default function CheckoutPage() {
  const cartItems = [
    {
      store_id: 4,
      product_id: 128,
      name: "Produk A",
      qty: 1,
      price: 68000,
      reward: 5,
      model: "Model X",
      sku: "SKU-A"
    },
    {
      store_id: 11,
      product_id: 128,
      name: "Produk B",
      qty: 1,
      price: 68000,
      reward: 5,
      model: "Model Y",
      sku: "SKU-B"
    }
  ];

  const customer = {
    customer_id: 171,
    firstname: "Risa Kurniawan",
    lastname: "",
    email: "risa7kurniawan@gmail.com",
    telephone: "081221841988",
    type_user: 1,
    customer_group_id: 2,
    comment: ""
  };

  const billingAddress = {
    payment_firstname: "Risa Kurniawan",
    payment_company: "Rumah",
    payment_address_1: "Gg. Haji Kecil 1 No.102",
    payment_address_2: "",
    payment_postcode: "61262",
    payment_city: "Sidoarjo",
    payment_zone: "Jawa Timur",
    payment_country: "Indonesia",
    payment_city_id: "379",
    payment_zone_id: "1517",
    payment_country_id: "100"
  };

  const shippingAddress = {
    shipping_firstname: "Risa Kurniawan",
    shipping_telephone: "081221841988",
    shipping_company: "Rumah",
    shipping_address_1: "Gg. Haji Kecil 1 No.102",
    shipping_address_2: "",
    shipping_postcode: "61262",
    shipping_city: "Sidoarjo",
    shipping_zone: "Jawa Timur",
    shipping_country: "Indonesia",
    shipping_city_id: "379",
    shipping_zone_id: "1517"
  };

  return (
    <CheckoutMultiStore
      cartItems={cartItems}
      customer={customer}
      billingAddress={billingAddress}
      shippingAddress={shippingAddress}
      adminFee={4400}
      onCheckoutComplete={(response) => {
        console.log('Checkout success:', response);
        // Redirect to thank you page or update UI
      }}
      onCheckoutError={(error) => {
        console.error('Checkout error:', error);
      }}
    />
  );
}
```

---

## 📋 CartItem Structure

Pastikan setiap item di keranjang punya struktur ini:

```typescript
{
  store_id: number,           // ID toko
  product_id: number,         // ID produk
  name: string,               // Nama produk
  qty: number,                // Jumlah
  price: number,              // Harga per unit
  reward?: number,            // Reward points (opsional)
  model?: string,             // Varian (opsional)
  sku?: string                // SKU (opsional)
}
```

---

## 🧮 Flow Checkout

```
1. User klik "Place Order & Pay"
   ↓
2. Validasi data (customer, alamat, cart items)
   ↓
3. Group items by store_id
   ↓
4. Build checkout payload dengan struktur multi-store
   ↓
5. POST /api/orders dengan jenis="mst"
   ↓
6. Backend membuat order + invoice per store
   ↓
7. Backend gabung semua item jadi 1 Midtrans transaction
   ↓
8. Response berisi:
   - orders[] (order_id, invoice_no per store)
   - midtrans.snap_token atau midtrans.redirect_url
   ↓
9. Buka Snap popup dengan token atau redirect ke Snap URL
   ↓
10. User bayar di Snap
    ↓
11. Callback: onSuccess/onPending/onError/onClose
```

---

## 🔧 Customization

### Ubah Admin Fee

```typescript
<CheckoutMultiStore
  // ...
  adminFee={5000}  // Ubah dari 4400 jadi 5000
/>
```

### Ongkir Per Store

Component sudah support ongkir per store. Setiap store di storeGroups punya field `ongkir` yang dijumlahkan otomatis.

### Customization UI (Tailwind CSS)

Semua class menggunakan Tailwind. Edit warna/ukuran langsung di component:

```typescript
// Ubah warna button
className = "bg-emerald-600 hover:bg-emerald-700";
// Menjadi
className = "bg-blue-600 hover:bg-blue-700";
```

---

## 🛡️ Validasi

Komponen otomatis validasi:

- ✅ customer_id, firstname, email, telephone
- ✅ Billing address lengkap
- ✅ Shipping address lengkap
- ✅ Minimal 1 store dengan items
- ✅ Qty > 0, price valid

Jika ada error, ditampilkan di red alert box sebelum submit.

---

## 💳 Midtrans Integration

### Snap Script Otomatis Loaded

Tidak perlu manual tambah script tag. Component handle semuanya:

```typescript
// Utility function otomatis:
// 1. Check if snap already loaded
// 2. Create & append script tag
// 3. Wait for snap to initialize
// 4. Call snap.pay(token)
```

### Sandbox vs Production

Auto-detect dari `midtrans.environment`:

```typescript
// Sandbox (default)
https://app.sandbox.midtrans.com/snap/snap.js

// Production
https://app.midtrans.com/snap/snap.js
```

---

## 🧪 Testing di Postman

Sudah bisa test langsung dengan payload ini:

```json
{
  "jenis": "mst",
  "customer_id": 171,
  "order_status_id": "1",
  "invoice_no": "INV",
  "payment_method": "midtrans",
  "admin_fee": 4400,
  "firstname": "Risa Kurniawan",
  "lastname": "",
  "email": "risa@example.com",
  "telephone": "081221841988",
  "payment_firstname": "Risa Kurniawan",
  "payment_address_1": "Alamat billing",
  "payment_postcode": "61262",
  "payment_city": "Sidoarjo",
  "payment_zone": "Jawa Timur",
  "payment_country": "Indonesia",
  "payment_city_id": "379",
  "payment_zone_id": "1517",
  "payment_country_id": "100",
  "shipping_firstname": "Risa Kurniawan",
  "shipping_telephone": "081221841988",
  "shipping_address_1": "Alamat kirim",
  "shipping_postcode": "61262",
  "shipping_city": "Sidoarjo",
  "shipping_zone": "Jawa Timur",
  "shipping_country": "Indonesia",
  "shipping_city_id": "379",
  "shipping_zone_id": "1517",
  "currency_code": "IDR",
  "stores": [
    {
      "store_id": 4,
      "store_name": "SC Jakarta Selatan",
      "ongkir": 65000,
      "shipping_method": "JTR",
      "items": [
        {
          "product_id": 128,
          "name": "Produk A",
          "qty": 1,
          "price": 68000,
          "reward": 5,
          "model": "Model 1",
          "sku": "SKU-001"
        }
      ]
    }
  ]
}
```

---

## 📊 Response Format

Backend return format:

```typescript
{
  "success": true,
  "message": "Checkout multi-store berhasil diproses",
  "orders": [
    {
      "order_id": 1001,
      "invoice_no": "INV1010010",
      "store_id": 4,
      "store_name": "SC Jakarta Selatan",
      "subtotal": 68000,
      "shipping_cost": 65000,
      "admin_fee": 4400,
      "total_amount": 137400,
      "total_qty": 1,
      "weight": 0.2
    }
  ],
  "checkout_summary": {
    "store_count": 1,
    "gross_amount": 137400,
    "transaction_order_id": "INV1010010-ALL"
  },
  "transaction": {
    "customer_details": { ... },
    "item_details": [ ... ],
    "transaction_details": {
      "order_id": "INV1010010-ALL",
      "gross_amount": 137400
    }
  },
  "midtrans": {
    "enabled": true,
    "client_key": "...",
    "environment": "sandbox",
    "snap_token": "...",
    "redirect_url": null
  }
}
```

---

## 🔐 Important Notes

1. **Token Handling**: Component otomatis ambil token dari localStorage
2. **Multi-Store Orders**: Setiap store = 1 order + 1 invoice di database
3. **Midtrans Gabung**: Semua store = 1 transaksi payment
4. **Ongkir Per Store**: Jangan lupa set ongkir di frontend per store
5. **Admin Fee Sekali**: Hanya diambil 1x (store pertama)
6. **Mutasi Stok**: Backend otomatis handle per order

---

## ❌ Common Issues & Solutions

### Issue: "You have an error in your SQL syntax"

**Solusi**: Backend sudah diperbaiki untuk gunakan parameterized queries yang proper.

### Issue: Snap token kosong

**Solusi**: Pastikan server_key Midtrans tersimpan di `sw_api_midtrans` dengan status=1

### Issue: Validation errors tapi data benar

**Solusi**: Pastikan semua field required diisi (firstname, email, telephone, etc)

### Issue: Multiple orders tapi hanya 1 invoice

**Solusi**: Setiap store = 1 order + 1 invoice terpisah di database, bukan 1 order untuk semua store

---

## 📚 Helper Functions Export

Kamu juga bisa pakai helpers langsung di kode:

```typescript
import { groupCartByStore, validateCheckout, buildCheckoutPayload, submitCheckout, formatCurrency, calculateTotals } from "@/services/checkout";

import { loadMidtransSnapScript, openMidtransSnap, processMidtransResponse, validateMidtransConfig } from "@/utils/midtrans";

// Example
const groups = groupCartByStore(cartItems);
const totals = calculateTotals(groups, 4400);
console.log("Grand Total:", formatCurrency(totals.grandTotal));
```

---

## 🎯 Next Steps

1. ✅ Copy 4 file ke project
2. ✅ Update cart structure kamu punya `store_id`
3. ✅ Import CheckoutMultiStore ke halaman checkout
4. ✅ Pass props: cartItems, customer, billingAddress, shippingAddress, adminFee
5. ✅ Test di localhost
6. ✅ Setup Midtrans sandbox api key di database
7. ✅ Test end-to-end flow

---

Good luck! 🚀
