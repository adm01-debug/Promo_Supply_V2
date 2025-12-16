// Mock data for purchase history - will be replaced with Bitrix24 integration

export interface PurchaseRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  productCategory: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  deliveryDays: number;
  expectedDeliveryDays: number;
  deliveredOnTime: boolean;
  qualityRating: number; // 1-5
  hasReturn: boolean;
  returnReason?: string;
  purchaseDate: string;
  deliveryDate: string;
  status: 'pending' | 'shipped' | 'delivered' | 'returned';
  bitrixDealId?: string;
}

export interface ProductHistory {
  id: string;
  name: string;
  sku: string;
  category: string;
  totalPurchases: number;
  totalQuantity: number;
  totalSpent: number;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  mainSupplier: string;
  supplierCount: number;
  lastPurchase: string;
  priceHistory: { date: string; price: number; supplier: string }[];
  qualityAvg: number;
  returnRate: number;
}

export interface SupplierHistory {
  id: string;
  name: string;
  cnpj: string;
  category: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  onTimeDeliveryRate: number;
  averageDeliveryDays: number;
  qualityRating: number;
  returnRate: number;
  lastOrder: string;
  productCount: number;
  bestDiscount: number;
  averageDiscount: number;
  monthlyVolume: { month: string; orders: number; value: number }[];
}

// Mock purchase records
export const purchaseRecords: PurchaseRecord[] = [
  // Ana Silva purchases
  {
    id: 'pr-001',
    orderId: 'ord-2638',
    orderNumber: '2638',
    productId: 'prod-001',
    productName: 'Mochila Executiva Premium',
    productCategory: 'Mochilas',
    supplierId: 'sup-001',
    supplierName: 'XBZ Brindes',
    quantity: 150,
    unitPrice: 45.90,
    totalPrice: 6885,
    discount: 18,
    deliveryDays: 12,
    expectedDeliveryDays: 14,
    deliveredOnTime: true,
    qualityRating: 5,
    hasReturn: false,
    purchaseDate: '2025-12-01',
    deliveryDate: '2025-12-13',
    status: 'delivered',
    bitrixDealId: 'B24-2638'
  },
  {
    id: 'pr-002',
    orderId: 'ord-2639',
    orderNumber: '2639',
    productId: 'prod-002',
    productName: 'Caneta Metal Premium',
    productCategory: 'Canetas',
    supplierId: 'sup-002',
    supplierName: 'Asia Import',
    quantity: 500,
    unitPrice: 8.50,
    totalPrice: 4250,
    discount: 12,
    deliveryDays: 8,
    expectedDeliveryDays: 10,
    deliveredOnTime: true,
    qualityRating: 4,
    hasReturn: false,
    purchaseDate: '2025-12-03',
    deliveryDate: '2025-12-11',
    status: 'delivered',
    bitrixDealId: 'B24-2639'
  },
  {
    id: 'pr-003',
    orderId: 'ord-2640',
    orderNumber: '2640',
    productId: 'prod-003',
    productName: 'Caderno Corporativo A5',
    productCategory: 'Cadernos',
    supplierId: 'sup-003',
    supplierName: 'Stricker',
    quantity: 200,
    unitPrice: 22.00,
    totalPrice: 4400,
    discount: 10,
    deliveryDays: 15,
    expectedDeliveryDays: 12,
    deliveredOnTime: false,
    qualityRating: 4,
    hasReturn: false,
    purchaseDate: '2025-12-05',
    deliveryDate: '2025-12-20',
    status: 'delivered',
    bitrixDealId: 'B24-2640'
  },
  {
    id: 'pr-004',
    orderId: 'ord-2641',
    orderNumber: '2641',
    productId: 'prod-001',
    productName: 'Mochila Executiva Premium',
    productCategory: 'Mochilas',
    supplierId: 'sup-002',
    supplierName: 'Asia Import',
    quantity: 80,
    unitPrice: 48.00,
    totalPrice: 3840,
    discount: 14,
    deliveryDays: 10,
    expectedDeliveryDays: 10,
    deliveredOnTime: true,
    qualityRating: 4,
    hasReturn: false,
    purchaseDate: '2025-11-15',
    deliveryDate: '2025-11-25',
    status: 'delivered',
    bitrixDealId: 'B24-2641'
  },
  {
    id: 'pr-005',
    orderId: 'ord-2642',
    orderNumber: '2642',
    productId: 'prod-004',
    productName: 'Squeeze Térmico 500ml',
    productCategory: 'Squeezes',
    supplierId: 'sup-004',
    supplierName: 'Só Marcas',
    quantity: 300,
    unitPrice: 28.50,
    totalPrice: 8550,
    discount: 15,
    deliveryDays: 7,
    expectedDeliveryDays: 8,
    deliveredOnTime: true,
    qualityRating: 5,
    hasReturn: false,
    purchaseDate: '2025-11-20',
    deliveryDate: '2025-11-27',
    status: 'delivered',
    bitrixDealId: 'B24-2642'
  },
  {
    id: 'pr-006',
    orderId: 'ord-2643',
    orderNumber: '2643',
    productId: 'prod-002',
    productName: 'Caneta Metal Premium',
    productCategory: 'Canetas',
    supplierId: 'sup-001',
    supplierName: 'XBZ Brindes',
    quantity: 1000,
    unitPrice: 7.80,
    totalPrice: 7800,
    discount: 20,
    deliveryDays: 6,
    expectedDeliveryDays: 7,
    deliveredOnTime: true,
    qualityRating: 5,
    hasReturn: false,
    purchaseDate: '2025-11-10',
    deliveryDate: '2025-11-16',
    status: 'delivered',
    bitrixDealId: 'B24-2643'
  },
  {
    id: 'pr-007',
    orderId: 'ord-2644',
    orderNumber: '2644',
    productId: 'prod-005',
    productName: 'Carregador Portátil 10000mAh',
    productCategory: 'Eletrônicos',
    supplierId: 'sup-005',
    supplierName: 'Tech Brindes',
    quantity: 100,
    unitPrice: 65.00,
    totalPrice: 6500,
    discount: 8,
    deliveryDays: 14,
    expectedDeliveryDays: 12,
    deliveredOnTime: false,
    qualityRating: 3,
    hasReturn: true,
    returnReason: '5 unidades com defeito',
    purchaseDate: '2025-11-05',
    deliveryDate: '2025-11-19',
    status: 'delivered',
    bitrixDealId: 'B24-2644'
  },
  {
    id: 'pr-008',
    orderId: 'ord-2645',
    orderNumber: '2645',
    productId: 'prod-001',
    productName: 'Mochila Executiva Premium',
    productCategory: 'Mochilas',
    supplierId: 'sup-001',
    supplierName: 'XBZ Brindes',
    quantity: 200,
    unitPrice: 44.50,
    totalPrice: 8900,
    discount: 20,
    deliveryDays: 11,
    expectedDeliveryDays: 14,
    deliveredOnTime: true,
    qualityRating: 5,
    hasReturn: false,
    purchaseDate: '2025-10-20',
    deliveryDate: '2025-10-31',
    status: 'delivered',
    bitrixDealId: 'B24-2645'
  },
  {
    id: 'pr-009',
    orderId: 'ord-2646',
    orderNumber: '2646',
    productId: 'prod-006',
    productName: 'Boné Trucker Personalizado',
    productCategory: 'Bonés',
    supplierId: 'sup-003',
    supplierName: 'Stricker',
    quantity: 250,
    unitPrice: 18.00,
    totalPrice: 4500,
    discount: 12,
    deliveryDays: 9,
    expectedDeliveryDays: 10,
    deliveredOnTime: true,
    qualityRating: 4,
    hasReturn: false,
    purchaseDate: '2025-10-15',
    deliveryDate: '2025-10-24',
    status: 'delivered',
    bitrixDealId: 'B24-2646'
  },
  {
    id: 'pr-010',
    orderId: 'ord-2647',
    orderNumber: '2647',
    productId: 'prod-003',
    productName: 'Caderno Corporativo A5',
    productCategory: 'Cadernos',
    supplierId: 'sup-002',
    supplierName: 'Asia Import',
    quantity: 400,
    unitPrice: 19.50,
    totalPrice: 7800,
    discount: 18,
    deliveryDays: 11,
    expectedDeliveryDays: 12,
    deliveredOnTime: true,
    qualityRating: 5,
    hasReturn: false,
    purchaseDate: '2025-10-08',
    deliveryDate: '2025-10-19',
    status: 'delivered',
    bitrixDealId: 'B24-2647'
  },
  {
    id: 'pr-011',
    orderId: 'ord-2648',
    orderNumber: '2648',
    productId: 'prod-004',
    productName: 'Squeeze Térmico 500ml',
    productCategory: 'Squeezes',
    supplierId: 'sup-001',
    supplierName: 'XBZ Brindes',
    quantity: 180,
    unitPrice: 26.00,
    totalPrice: 4680,
    discount: 22,
    deliveryDays: 8,
    expectedDeliveryDays: 10,
    deliveredOnTime: true,
    qualityRating: 5,
    hasReturn: false,
    purchaseDate: '2025-09-25',
    deliveryDate: '2025-10-03',
    status: 'delivered',
    bitrixDealId: 'B24-2648'
  },
  {
    id: 'pr-012',
    orderId: 'ord-2649',
    orderNumber: '2649',
    productId: 'prod-007',
    productName: 'Camiseta Polo Corporativa',
    productCategory: 'Camisetas',
    supplierId: 'sup-006',
    supplierName: 'Estrela Brindes',
    quantity: 150,
    unitPrice: 42.00,
    totalPrice: 6300,
    discount: 10,
    deliveryDays: 18,
    expectedDeliveryDays: 15,
    deliveredOnTime: false,
    qualityRating: 4,
    hasReturn: false,
    purchaseDate: '2025-09-15',
    deliveryDate: '2025-10-03',
    status: 'delivered',
    bitrixDealId: 'B24-2649'
  },
  // Pending orders
  {
    id: 'pr-013',
    orderId: 'ord-2650',
    orderNumber: '2650',
    productId: 'prod-002',
    productName: 'Caneta Metal Premium',
    productCategory: 'Canetas',
    supplierId: 'sup-001',
    supplierName: 'XBZ Brindes',
    quantity: 800,
    unitPrice: 7.50,
    totalPrice: 6000,
    discount: 22,
    deliveryDays: 0,
    expectedDeliveryDays: 7,
    deliveredOnTime: false,
    qualityRating: 0,
    hasReturn: false,
    purchaseDate: '2025-12-14',
    deliveryDate: '',
    status: 'shipped',
    bitrixDealId: 'B24-2650'
  },
  {
    id: 'pr-014',
    orderId: 'ord-2651',
    orderNumber: '2651',
    productId: 'prod-008',
    productName: 'Mouse Pad Gamer RGB',
    productCategory: 'Eletrônicos',
    supplierId: 'sup-005',
    supplierName: 'Tech Brindes',
    quantity: 200,
    unitPrice: 35.00,
    totalPrice: 7000,
    discount: 15,
    deliveryDays: 0,
    expectedDeliveryDays: 10,
    deliveredOnTime: false,
    qualityRating: 0,
    hasReturn: false,
    purchaseDate: '2025-12-12',
    deliveryDate: '',
    status: 'pending',
    bitrixDealId: 'B24-2651'
  }
];

// Aggregated product history
export const productsHistory: ProductHistory[] = [
  {
    id: 'prod-001',
    name: 'Mochila Executiva Premium',
    sku: 'MOCH-EXE-001',
    category: 'Mochilas',
    totalPurchases: 3,
    totalQuantity: 430,
    totalSpent: 19625,
    averagePrice: 45.64,
    lowestPrice: 44.50,
    highestPrice: 48.00,
    mainSupplier: 'XBZ Brindes',
    supplierCount: 2,
    lastPurchase: '2025-12-01',
    priceHistory: [
      { date: '2025-10-20', price: 44.50, supplier: 'XBZ Brindes' },
      { date: '2025-11-15', price: 48.00, supplier: 'Asia Import' },
      { date: '2025-12-01', price: 45.90, supplier: 'XBZ Brindes' }
    ],
    qualityAvg: 4.7,
    returnRate: 0
  },
  {
    id: 'prod-002',
    name: 'Caneta Metal Premium',
    sku: 'CAN-MET-001',
    category: 'Canetas',
    totalPurchases: 3,
    totalQuantity: 2300,
    totalSpent: 18050,
    averagePrice: 7.85,
    lowestPrice: 7.50,
    highestPrice: 8.50,
    mainSupplier: 'XBZ Brindes',
    supplierCount: 2,
    lastPurchase: '2025-12-14',
    priceHistory: [
      { date: '2025-11-10', price: 7.80, supplier: 'XBZ Brindes' },
      { date: '2025-12-03', price: 8.50, supplier: 'Asia Import' },
      { date: '2025-12-14', price: 7.50, supplier: 'XBZ Brindes' }
    ],
    qualityAvg: 4.5,
    returnRate: 0
  },
  {
    id: 'prod-003',
    name: 'Caderno Corporativo A5',
    sku: 'CAD-CORP-001',
    category: 'Cadernos',
    totalPurchases: 2,
    totalQuantity: 600,
    totalSpent: 12200,
    averagePrice: 20.33,
    lowestPrice: 19.50,
    highestPrice: 22.00,
    mainSupplier: 'Stricker',
    supplierCount: 2,
    lastPurchase: '2025-12-05',
    priceHistory: [
      { date: '2025-10-08', price: 19.50, supplier: 'Asia Import' },
      { date: '2025-12-05', price: 22.00, supplier: 'Stricker' }
    ],
    qualityAvg: 4.5,
    returnRate: 0
  },
  {
    id: 'prod-004',
    name: 'Squeeze Térmico 500ml',
    sku: 'SQZ-TER-001',
    category: 'Squeezes',
    totalPurchases: 2,
    totalQuantity: 480,
    totalSpent: 13230,
    averagePrice: 27.56,
    lowestPrice: 26.00,
    highestPrice: 28.50,
    mainSupplier: 'Só Marcas',
    supplierCount: 2,
    lastPurchase: '2025-11-20',
    priceHistory: [
      { date: '2025-09-25', price: 26.00, supplier: 'XBZ Brindes' },
      { date: '2025-11-20', price: 28.50, supplier: 'Só Marcas' }
    ],
    qualityAvg: 5.0,
    returnRate: 0
  },
  {
    id: 'prod-005',
    name: 'Carregador Portátil 10000mAh',
    sku: 'CAR-PORT-001',
    category: 'Eletrônicos',
    totalPurchases: 1,
    totalQuantity: 100,
    totalSpent: 6500,
    averagePrice: 65.00,
    lowestPrice: 65.00,
    highestPrice: 65.00,
    mainSupplier: 'Tech Brindes',
    supplierCount: 1,
    lastPurchase: '2025-11-05',
    priceHistory: [
      { date: '2025-11-05', price: 65.00, supplier: 'Tech Brindes' }
    ],
    qualityAvg: 3.0,
    returnRate: 5.0
  },
  {
    id: 'prod-006',
    name: 'Boné Trucker Personalizado',
    sku: 'BON-TRU-001',
    category: 'Bonés',
    totalPurchases: 1,
    totalQuantity: 250,
    totalSpent: 4500,
    averagePrice: 18.00,
    lowestPrice: 18.00,
    highestPrice: 18.00,
    mainSupplier: 'Stricker',
    supplierCount: 1,
    lastPurchase: '2025-10-15',
    priceHistory: [
      { date: '2025-10-15', price: 18.00, supplier: 'Stricker' }
    ],
    qualityAvg: 4.0,
    returnRate: 0
  },
  {
    id: 'prod-007',
    name: 'Camiseta Polo Corporativa',
    sku: 'CAM-POLO-001',
    category: 'Camisetas',
    totalPurchases: 1,
    totalQuantity: 150,
    totalSpent: 6300,
    averagePrice: 42.00,
    lowestPrice: 42.00,
    highestPrice: 42.00,
    mainSupplier: 'Estrela Brindes',
    supplierCount: 1,
    lastPurchase: '2025-09-15',
    priceHistory: [
      { date: '2025-09-15', price: 42.00, supplier: 'Estrela Brindes' }
    ],
    qualityAvg: 4.0,
    returnRate: 0
  },
  {
    id: 'prod-008',
    name: 'Mouse Pad Gamer RGB',
    sku: 'MOU-GAM-001',
    category: 'Eletrônicos',
    totalPurchases: 1,
    totalQuantity: 200,
    totalSpent: 7000,
    averagePrice: 35.00,
    lowestPrice: 35.00,
    highestPrice: 35.00,
    mainSupplier: 'Tech Brindes',
    supplierCount: 1,
    lastPurchase: '2025-12-12',
    priceHistory: [
      { date: '2025-12-12', price: 35.00, supplier: 'Tech Brindes' }
    ],
    qualityAvg: 0,
    returnRate: 0
  }
];

// Aggregated supplier history
export const suppliersHistory: SupplierHistory[] = [
  {
    id: 'sup-001',
    name: 'XBZ Brindes',
    cnpj: '12.345.678/0001-90',
    category: 'Brindes Gerais',
    totalOrders: 5,
    totalSpent: 34265,
    averageOrderValue: 6853,
    onTimeDeliveryRate: 100,
    averageDeliveryDays: 9.4,
    qualityRating: 5.0,
    returnRate: 0,
    lastOrder: '2025-12-14',
    productCount: 3,
    bestDiscount: 22,
    averageDiscount: 20.4,
    monthlyVolume: [
      { month: 'Set', orders: 1, value: 4680 },
      { month: 'Out', orders: 1, value: 8900 },
      { month: 'Nov', orders: 1, value: 7800 },
      { month: 'Dez', orders: 2, value: 12885 }
    ]
  },
  {
    id: 'sup-002',
    name: 'Asia Import',
    cnpj: '23.456.789/0001-01',
    category: 'Importados',
    totalOrders: 3,
    totalSpent: 15890,
    averageOrderValue: 5297,
    onTimeDeliveryRate: 100,
    averageDeliveryDays: 9.67,
    qualityRating: 4.33,
    returnRate: 0,
    lastOrder: '2025-12-03',
    productCount: 3,
    bestDiscount: 18,
    averageDiscount: 14.67,
    monthlyVolume: [
      { month: 'Out', orders: 1, value: 7800 },
      { month: 'Nov', orders: 1, value: 3840 },
      { month: 'Dez', orders: 1, value: 4250 }
    ]
  },
  {
    id: 'sup-003',
    name: 'Stricker',
    cnpj: '34.567.890/0001-12',
    category: 'Brindes Premium',
    totalOrders: 2,
    totalSpent: 8900,
    averageOrderValue: 4450,
    onTimeDeliveryRate: 50,
    averageDeliveryDays: 12,
    qualityRating: 4.0,
    returnRate: 0,
    lastOrder: '2025-12-05',
    productCount: 2,
    bestDiscount: 12,
    averageDiscount: 11,
    monthlyVolume: [
      { month: 'Out', orders: 1, value: 4500 },
      { month: 'Dez', orders: 1, value: 4400 }
    ]
  },
  {
    id: 'sup-004',
    name: 'Só Marcas',
    cnpj: '45.678.901/0001-23',
    category: 'Squeezes e Garrafas',
    totalOrders: 1,
    totalSpent: 8550,
    averageOrderValue: 8550,
    onTimeDeliveryRate: 100,
    averageDeliveryDays: 7,
    qualityRating: 5.0,
    returnRate: 0,
    lastOrder: '2025-11-20',
    productCount: 1,
    bestDiscount: 15,
    averageDiscount: 15,
    monthlyVolume: [
      { month: 'Nov', orders: 1, value: 8550 }
    ]
  },
  {
    id: 'sup-005',
    name: 'Tech Brindes',
    cnpj: '56.789.012/0001-34',
    category: 'Eletrônicos',
    totalOrders: 2,
    totalSpent: 13500,
    averageOrderValue: 6750,
    onTimeDeliveryRate: 0,
    averageDeliveryDays: 14,
    qualityRating: 3.0,
    returnRate: 5.0,
    lastOrder: '2025-12-12',
    productCount: 2,
    bestDiscount: 15,
    averageDiscount: 11.5,
    monthlyVolume: [
      { month: 'Nov', orders: 1, value: 6500 },
      { month: 'Dez', orders: 1, value: 7000 }
    ]
  },
  {
    id: 'sup-006',
    name: 'Estrela Brindes',
    cnpj: '67.890.123/0001-45',
    category: 'Vestuário',
    totalOrders: 1,
    totalSpent: 6300,
    averageOrderValue: 6300,
    onTimeDeliveryRate: 0,
    averageDeliveryDays: 18,
    qualityRating: 4.0,
    returnRate: 0,
    lastOrder: '2025-09-15',
    productCount: 1,
    bestDiscount: 10,
    averageDiscount: 10,
    monthlyVolume: [
      { month: 'Set', orders: 1, value: 6300 }
    ]
  }
];

// Categories
export const productCategories = [
  'Mochilas',
  'Canetas',
  'Cadernos',
  'Squeezes',
  'Eletrônicos',
  'Bonés',
  'Camisetas'
];
