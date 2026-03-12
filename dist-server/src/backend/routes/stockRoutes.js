import { Router } from 'express';
import { getStock, getStoreWilayah, saveOrder, updateOrder, getProdukStore } from '../controllers/stockController.js';
const router = Router();
router.get('/stock', getStock);
router.get('/stores/wilayah', getStoreWilayah);
router.post('/order', saveOrder);
router.put('/order', updateOrder);
router.get('/produk-store', getProdukStore);
export default router;
