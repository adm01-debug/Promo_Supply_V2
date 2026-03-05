/**
 * Mock data for Purchase History page
 */

export interface PurchaseRecord {
  id: string;
  orderNumber: string;
  bitrixDealId?: string;
  productId: string;
  productName: string;
  productCategory: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  totalValue: number;
  discount: number;
  status: 'pending' | 'shipped' | 'delivered' | 'returned';
  deliveryDate?: string;
  deliveredOnTime?: boolean;
  qualityRating?: number;
}

export interface ProductHistory {
  id: string;
  name: string;
  sku: string;
  category: string;
  avgPrice: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  lowestPrice: number;
  highestPrice: number;
  totalPurchased: number;
  totalPurchases: number;
  totalQuantity: number;
  totalSpent: number;
  qualityAvg: number;
  priceHistory: { date: string; price: number }[];
}

export interface SupplierHistory {
  id: string;
  name: string;
  cnpj: string;
  category?: string;
  avgDeliveryDays: number;
  averageDeliveryDays: number;
  onTimeRate: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  qualityRating: number;
  totalOrders: number;
  totalValue: number;
  totalSpent: number;
  averageOrderValue: number;
  averageDiscount: number;
  bestDiscount: number;
  productCount: number;
  returnRate: number;
  monthlyVolume: { month: string; value: number; orders: number }[];
}

export const productCategories = [
  'Canetas', 'Camisetas', 'Chaveiros', 'Copos', 'Mochilas', 'Bonés', 'Cadernos', 'Squeeze'
];

export const suppliersHistory: SupplierHistory[] = [
  { id: 's1', name: 'Gráfica Express', cnpj: '12.345.678/0001-01', category: 'Impressão', avgDeliveryDays: 5, averageDeliveryDays: 5, onTimeRate: 92, onTimeDeliveryRate: 92, qualityScore: 4.5, qualityRating: 4.5, totalOrders: 48, totalValue: 125000, totalSpent: 125000, averageOrderValue: 2604, averageDiscount: 4.2, bestDiscount: 12, productCount: 8, returnRate: 2.1, monthlyVolume: [{ month: 'Jan', value: 18000, orders: 6 }, { month: 'Fev', value: 22000, orders: 8 }, { month: 'Mar', value: 20000, orders: 7 }, { month: 'Abr', value: 25000, orders: 9 }] },
  { id: 's2', name: 'Brindes & Cia', cnpj: '23.456.789/0001-02', category: 'Brindes', avgDeliveryDays: 7, averageDeliveryDays: 7, onTimeRate: 88, onTimeDeliveryRate: 88, qualityScore: 4.2, qualityRating: 4.2, totalOrders: 35, totalValue: 98000, totalSpent: 98000, averageOrderValue: 2800, averageDiscount: 3.5, bestDiscount: 10, productCount: 6, returnRate: 3.0, monthlyVolume: [{ month: 'Jan', value: 15000, orders: 5 }, { month: 'Fev', value: 18000, orders: 6 }, { month: 'Mar', value: 20000, orders: 7 }, { month: 'Abr', value: 16000, orders: 5 }] },
  { id: 's3', name: 'Promo Fácil', cnpj: '34.567.890/0001-03', category: 'Promocionais', avgDeliveryDays: 4, averageDeliveryDays: 4, onTimeRate: 95, onTimeDeliveryRate: 95, qualityScore: 4.8, qualityRating: 4.8, totalOrders: 62, totalValue: 210000, totalSpent: 210000, averageOrderValue: 3387, averageDiscount: 5.0, bestDiscount: 15, productCount: 12, returnRate: 1.2, monthlyVolume: [{ month: 'Jan', value: 30000, orders: 10 }, { month: 'Fev', value: 35000, orders: 12 }, { month: 'Mar', value: 32000, orders: 11 }, { month: 'Abr', value: 38000, orders: 13 }] },
  { id: 's4', name: 'Top Gifts', cnpj: '45.678.901/0001-04', category: 'Presentes', avgDeliveryDays: 6, averageDeliveryDays: 6, onTimeRate: 85, onTimeDeliveryRate: 85, qualityScore: 4.0, qualityRating: 4.0, totalOrders: 28, totalValue: 76000, totalSpent: 76000, averageOrderValue: 2714, averageDiscount: 3.0, bestDiscount: 8, productCount: 5, returnRate: 4.5, monthlyVolume: [{ month: 'Jan', value: 12000, orders: 4 }, { month: 'Fev', value: 14000, orders: 5 }, { month: 'Mar', value: 16000, orders: 5 }, { month: 'Abr', value: 13000, orders: 4 }] },
];

export const productsHistory: ProductHistory[] = [
  { id: 'p1', name: 'Caneta Personalizada Premium', sku: 'CAN-001', category: 'Canetas', avgPrice: 3.50, averagePrice: 3.50, minPrice: 2.80, maxPrice: 4.20, lowestPrice: 2.80, highestPrice: 4.20, totalPurchased: 5000, totalPurchases: 12, totalQuantity: 5000, totalSpent: 17500, qualityAvg: 4.5, priceHistory: [{ date: '2025-01', price: 3.80 }, { date: '2025-02', price: 3.50 }, { date: '2025-03', price: 3.20 }, { date: '2025-04', price: 3.50 }] },
  { id: 'p2', name: 'Camiseta Algodão 100%', sku: 'CAM-001', category: 'Camisetas', avgPrice: 22.00, averagePrice: 22.00, minPrice: 18.00, maxPrice: 28.00, lowestPrice: 18.00, highestPrice: 28.00, totalPurchased: 1200, totalPurchases: 8, totalQuantity: 1200, totalSpent: 26400, qualityAvg: 4.2, priceHistory: [{ date: '2025-01', price: 25.00 }, { date: '2025-02', price: 22.00 }, { date: '2025-03', price: 20.00 }, { date: '2025-04', price: 22.00 }] },
  { id: 'p3', name: 'Chaveiro Metal Logo', sku: 'CHA-001', category: 'Chaveiros', avgPrice: 5.00, averagePrice: 5.00, minPrice: 3.50, maxPrice: 6.50, lowestPrice: 3.50, highestPrice: 6.50, totalPurchased: 3000, totalPurchases: 10, totalQuantity: 3000, totalSpent: 15000, qualityAvg: 4.0, priceHistory: [{ date: '2025-01', price: 5.50 }, { date: '2025-02', price: 5.00 }, { date: '2025-03', price: 4.50 }, { date: '2025-04', price: 5.00 }] },
  { id: 'p4', name: 'Squeeze Inox 500ml', sku: 'SQZ-001', category: 'Squeeze', avgPrice: 18.00, averagePrice: 18.00, minPrice: 15.00, maxPrice: 22.00, lowestPrice: 15.00, highestPrice: 22.00, totalPurchased: 800, totalPurchases: 5, totalQuantity: 800, totalSpent: 14400, qualityAvg: 3.8, priceHistory: [{ date: '2025-01', price: 20.00 }, { date: '2025-02', price: 18.00 }, { date: '2025-03', price: 16.00 }, { date: '2025-04', price: 18.00 }] },
];

export const purchaseRecords: PurchaseRecord[] = [
  { id: 'r1', orderNumber: 'PED-000001', bitrixDealId: 'D-1001', productId: 'p1', productName: 'Caneta Personalizada Premium', productCategory: 'Canetas', supplierId: 's1', supplierName: 'Gráfica Express', purchaseDate: '2025-04-10', quantity: 1000, unitPrice: 3.50, totalPrice: 3500, totalValue: 3500, discount: 5, status: 'delivered', deliveryDate: '2025-04-15', deliveredOnTime: true, qualityRating: 4.5 },
  { id: 'r2', orderNumber: 'PED-000002', bitrixDealId: 'D-1002', productId: 'p2', productName: 'Camiseta Algodão 100%', productCategory: 'Camisetas', supplierId: 's2', supplierName: 'Brindes & Cia', purchaseDate: '2025-04-12', quantity: 200, unitPrice: 22.00, totalPrice: 4400, totalValue: 4400, discount: 3, status: 'delivered', deliveryDate: '2025-04-20', deliveredOnTime: true, qualityRating: 4.2 },
  { id: 'r3', orderNumber: 'PED-000003', bitrixDealId: 'D-1003', productId: 'p3', productName: 'Chaveiro Metal Logo', productCategory: 'Chaveiros', supplierId: 's3', supplierName: 'Promo Fácil', purchaseDate: '2025-04-18', quantity: 500, unitPrice: 5.00, totalPrice: 2500, totalValue: 2500, discount: 0, status: 'shipped', deliveredOnTime: false, qualityRating: 4.8 },
  { id: 'r4', orderNumber: 'PED-000004', bitrixDealId: 'D-1004', productId: 'p4', productName: 'Squeeze Inox 500ml', productCategory: 'Squeeze', supplierId: 's4', supplierName: 'Top Gifts', purchaseDate: '2025-04-22', quantity: 100, unitPrice: 18.00, totalPrice: 1800, totalValue: 1800, discount: 10, status: 'pending', deliveredOnTime: false },
  { id: 'r5', orderNumber: 'PED-000005', bitrixDealId: 'D-1005', productId: 'p1', productName: 'Caneta Personalizada Premium', productCategory: 'Canetas', supplierId: 's3', supplierName: 'Promo Fácil', purchaseDate: '2025-03-05', quantity: 2000, unitPrice: 3.20, totalPrice: 6400, totalValue: 6400, discount: 8, status: 'delivered', deliveryDate: '2025-03-10', deliveredOnTime: true, qualityRating: 4.7 },
  { id: 'r6', orderNumber: 'PED-000006', bitrixDealId: 'D-1006', productId: 'p2', productName: 'Camiseta Algodão 100%', productCategory: 'Camisetas', supplierId: 's1', supplierName: 'Gráfica Express', purchaseDate: '2025-03-15', quantity: 300, unitPrice: 20.00, totalPrice: 6000, totalValue: 6000, discount: 5, status: 'delivered', deliveryDate: '2025-03-21', deliveredOnTime: false, qualityRating: 4.3 },
  { id: 'r7', orderNumber: 'PED-000007', bitrixDealId: 'D-1007', productId: 'p3', productName: 'Chaveiro Metal Logo', productCategory: 'Chaveiros', supplierId: 's2', supplierName: 'Brindes & Cia', purchaseDate: '2025-02-10', quantity: 1000, unitPrice: 4.50, totalPrice: 4500, totalValue: 4500, discount: 2, status: 'delivered', deliveryDate: '2025-02-18', deliveredOnTime: true, qualityRating: 4.0 },
  { id: 'r8', orderNumber: 'PED-000008', bitrixDealId: 'D-1008', productId: 'p1', productName: 'Caneta Personalizada Premium', productCategory: 'Canetas', supplierId: 's1', supplierName: 'Gráfica Express', purchaseDate: '2025-01-20', quantity: 1500, unitPrice: 3.80, totalPrice: 5700, totalValue: 5700, discount: 0, status: 'delivered', deliveryDate: '2025-01-25', deliveredOnTime: true, qualityRating: 4.6 },
  { id: 'r9', orderNumber: 'PED-000009', bitrixDealId: 'D-1009', productId: 'p4', productName: 'Squeeze Inox 500ml', productCategory: 'Squeeze', supplierId: 's3', supplierName: 'Promo Fácil', purchaseDate: '2025-01-08', quantity: 150, unitPrice: 16.00, totalPrice: 2400, totalValue: 2400, discount: 5, status: 'returned', deliveryDate: '2025-01-14', deliveredOnTime: true, qualityRating: 2.5 },
  { id: 'r10', orderNumber: 'PED-000010', bitrixDealId: 'D-1010', productId: 'p2', productName: 'Camiseta Algodão 100%', productCategory: 'Camisetas', supplierId: 's4', supplierName: 'Top Gifts', purchaseDate: '2024-12-20', quantity: 500, unitPrice: 25.00, totalPrice: 12500, totalValue: 12500, discount: 4, status: 'delivered', deliveryDate: '2024-12-28', deliveredOnTime: false, qualityRating: 3.8 },
];
