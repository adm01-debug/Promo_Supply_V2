/**
 * Mock data for Purchase History page
 */

export interface PurchaseRecord {
  id: string;
  orderNumber: string;
  productId: string;
  productName: string;
  productCategory: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  discount: number;
  status: 'pending' | 'shipped' | 'delivered' | 'returned';
  deliveryDate?: string;
  qualityRating?: number;
}

export interface ProductHistory {
  id: string;
  name: string;
  sku: string;
  category: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalPurchased: number;
  priceHistory: { date: string; price: number }[];
}

export interface SupplierHistory {
  id: string;
  name: string;
  cnpj: string;
  avgDeliveryDays: number;
  onTimeRate: number;
  qualityScore: number;
  totalOrders: number;
  totalValue: number;
}

export const productCategories = [
  'Canetas', 'Camisetas', 'Chaveiros', 'Copos', 'Mochilas', 'Bonés', 'Cadernos', 'Squeeze'
];

export const suppliersHistory: SupplierHistory[] = [
  { id: 's1', name: 'Gráfica Express', cnpj: '12.345.678/0001-01', avgDeliveryDays: 5, onTimeRate: 92, qualityScore: 4.5, totalOrders: 48, totalValue: 125000 },
  { id: 's2', name: 'Brindes & Cia', cnpj: '23.456.789/0001-02', avgDeliveryDays: 7, onTimeRate: 88, qualityScore: 4.2, totalOrders: 35, totalValue: 98000 },
  { id: 's3', name: 'Promo Fácil', cnpj: '34.567.890/0001-03', avgDeliveryDays: 4, onTimeRate: 95, qualityScore: 4.8, totalOrders: 62, totalValue: 210000 },
  { id: 's4', name: 'Top Gifts', cnpj: '45.678.901/0001-04', avgDeliveryDays: 6, onTimeRate: 85, qualityScore: 4.0, totalOrders: 28, totalValue: 76000 },
];

export const productsHistory: ProductHistory[] = [
  { id: 'p1', name: 'Caneta Personalizada Premium', sku: 'CAN-001', category: 'Canetas', avgPrice: 3.50, minPrice: 2.80, maxPrice: 4.20, totalPurchased: 5000, priceHistory: [{ date: '2025-01', price: 3.80 }, { date: '2025-02', price: 3.50 }, { date: '2025-03', price: 3.20 }, { date: '2025-04', price: 3.50 }] },
  { id: 'p2', name: 'Camiseta Algodão 100%', sku: 'CAM-001', category: 'Camisetas', avgPrice: 22.00, minPrice: 18.00, maxPrice: 28.00, totalPurchased: 1200, priceHistory: [{ date: '2025-01', price: 25.00 }, { date: '2025-02', price: 22.00 }, { date: '2025-03', price: 20.00 }, { date: '2025-04', price: 22.00 }] },
  { id: 'p3', name: 'Chaveiro Metal Logo', sku: 'CHA-001', category: 'Chaveiros', avgPrice: 5.00, minPrice: 3.50, maxPrice: 6.50, totalPurchased: 3000, priceHistory: [{ date: '2025-01', price: 5.50 }, { date: '2025-02', price: 5.00 }, { date: '2025-03', price: 4.50 }, { date: '2025-04', price: 5.00 }] },
  { id: 'p4', name: 'Squeeze Inox 500ml', sku: 'SQZ-001', category: 'Squeeze', avgPrice: 18.00, minPrice: 15.00, maxPrice: 22.00, totalPurchased: 800, priceHistory: [{ date: '2025-01', price: 20.00 }, { date: '2025-02', price: 18.00 }, { date: '2025-03', price: 16.00 }, { date: '2025-04', price: 18.00 }] },
];

export const purchaseRecords: PurchaseRecord[] = [
  { id: 'r1', orderNumber: 'PED-000001', productId: 'p1', productName: 'Caneta Personalizada Premium', productCategory: 'Canetas', supplierId: 's1', supplierName: 'Gráfica Express', purchaseDate: '2025-04-10', quantity: 1000, unitPrice: 3.50, totalValue: 3500, discount: 5, status: 'delivered', deliveryDate: '2025-04-15', qualityRating: 4.5 },
  { id: 'r2', orderNumber: 'PED-000002', productId: 'p2', productName: 'Camiseta Algodão 100%', productCategory: 'Camisetas', supplierId: 's2', supplierName: 'Brindes & Cia', purchaseDate: '2025-04-12', quantity: 200, unitPrice: 22.00, totalValue: 4400, discount: 3, status: 'delivered', deliveryDate: '2025-04-20', qualityRating: 4.2 },
  { id: 'r3', orderNumber: 'PED-000003', productId: 'p3', productName: 'Chaveiro Metal Logo', productCategory: 'Chaveiros', supplierId: 's3', supplierName: 'Promo Fácil', purchaseDate: '2025-04-18', quantity: 500, unitPrice: 5.00, totalValue: 2500, discount: 0, status: 'shipped', qualityRating: 4.8 },
  { id: 'r4', orderNumber: 'PED-000004', productId: 'p4', productName: 'Squeeze Inox 500ml', productCategory: 'Squeeze', supplierId: 's4', supplierName: 'Top Gifts', purchaseDate: '2025-04-22', quantity: 100, unitPrice: 18.00, totalValue: 1800, discount: 10, status: 'pending' },
  { id: 'r5', orderNumber: 'PED-000005', productId: 'p1', productName: 'Caneta Personalizada Premium', productCategory: 'Canetas', supplierId: 's3', supplierName: 'Promo Fácil', purchaseDate: '2025-03-05', quantity: 2000, unitPrice: 3.20, totalValue: 6400, discount: 8, status: 'delivered', deliveryDate: '2025-03-10', qualityRating: 4.7 },
  { id: 'r6', orderNumber: 'PED-000006', productId: 'p2', productName: 'Camiseta Algodão 100%', productCategory: 'Camisetas', supplierId: 's1', supplierName: 'Gráfica Express', purchaseDate: '2025-03-15', quantity: 300, unitPrice: 20.00, totalValue: 6000, discount: 5, status: 'delivered', deliveryDate: '2025-03-21', qualityRating: 4.3 },
  { id: 'r7', orderNumber: 'PED-000007', productId: 'p3', productName: 'Chaveiro Metal Logo', productCategory: 'Chaveiros', supplierId: 's2', supplierName: 'Brindes & Cia', purchaseDate: '2025-02-10', quantity: 1000, unitPrice: 4.50, totalValue: 4500, discount: 2, status: 'delivered', deliveryDate: '2025-02-18', qualityRating: 4.0 },
  { id: 'r8', orderNumber: 'PED-000008', productId: 'p1', productName: 'Caneta Personalizada Premium', productCategory: 'Canetas', supplierId: 's1', supplierName: 'Gráfica Express', purchaseDate: '2025-01-20', quantity: 1500, unitPrice: 3.80, totalValue: 5700, discount: 0, status: 'delivered', deliveryDate: '2025-01-25', qualityRating: 4.6 },
  { id: 'r9', orderNumber: 'PED-000009', productId: 'p4', productName: 'Squeeze Inox 500ml', productCategory: 'Squeeze', supplierId: 's3', supplierName: 'Promo Fácil', purchaseDate: '2025-01-08', quantity: 150, unitPrice: 16.00, totalValue: 2400, discount: 5, status: 'returned', deliveryDate: '2025-01-14', qualityRating: 2.5 },
  { id: 'r10', orderNumber: 'PED-000010', productId: 'p2', productName: 'Camiseta Algodão 100%', productCategory: 'Camisetas', supplierId: 's4', supplierName: 'Top Gifts', purchaseDate: '2024-12-20', quantity: 500, unitPrice: 25.00, totalValue: 12500, discount: 4, status: 'delivered', deliveryDate: '2024-12-28', qualityRating: 3.8 },
];
