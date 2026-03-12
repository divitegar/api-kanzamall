import { Router } from 'express';
import {
  getAddress,
  getAddressWilayah,
  saveAddress,
  updateAddress,
  updateAddressDefault,
  deleteAddress,
  getKodepos,
  getKelurahan,
  getKecamatan,
  getKota,
  getPropinsi,
  getCountry,
} from '../controllers/addressController.js';

const router = Router();

// Addresses
// GET /api/addresses?customer_id= or /api/addresses/:customer_id or /api/addresses/:customer_id/:address_id
router.get('/addresses', getAddress);
router.get('/addresses/:customer_id', getAddress);
router.get('/addresses/:customer_id/:address_id', getAddress);

// Wilayah by city
router.get('/address-wilayah', getAddressWilayah);
router.get('/address-wilayah/:city_id', getAddressWilayah);

// CRUD
router.post('/addresses', saveAddress);
router.put('/addresses/:id', updateAddress);
router.patch('/addresses/default/:customer_id', updateAddressDefault);
router.delete('/addresses/:id', deleteAddress);

// Kodepos / Kelurahan / Kecamatan / Kota / Propinsi / Country
router.get('/kodepos', getKodepos);
router.get('/kodepos/:code_dest_id', getKodepos);

router.get('/kelurahan', getKelurahan);
router.get('/kelurahan/:district_id', getKelurahan);

router.get('/kecamatan', getKecamatan);
router.get('/kecamatan/:city_id', getKecamatan);

router.get('/kota', getKota);
router.get('/kota/:zone_id', getKota);

router.get('/propinsi', getPropinsi);
router.get('/propinsi/:country_id', getPropinsi);
router.get('/propinsi/:country_id/:zone_id', getPropinsi);

router.get('/country', getCountry);
router.get('/country/:country_id', getCountry);

export default router;
