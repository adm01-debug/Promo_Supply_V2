import { z } from 'zod';

// Schema para Pedidos de Compra
export const pedidoCompraSchema = z.object({
  numero: z.string().min(1, 'Número é obrigatório'),
  fornecedor_id: z.string().uuid('Fornecedor inválido'),
  data_pedido: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  data_entrega_prevista: z.string().optional(),
  valor_total: z.coerce.number().positive('Valor deve ser positivo'),
  status: z.enum(['rascunho', 'aguardando_aprovacao', 'aprovado', 'em_andamento', 'entregue', 'cancelado']).default('rascunho'),
  observacoes: z.string().optional(),
});

// Schema para Fornecedores
export const fornecedorSchema = z.object({
  razao_social: z.string().min(1, 'Razão social é obrigatória'),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().regex(/^\d{14}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
  email: z.string().email('E-mail inválido').optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().length(2).optional(),
  cep: z.string().optional(),
  categoria: z.string().optional(),
  ativo: z.coerce.boolean().default(true),
});

// Schema para Produtos
export const produtoCompraSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  unidade: z.string().default('UN'),
  preco_unitario: z.coerce.number().positive().optional(),
  categoria: z.string().optional(),
  fornecedor_preferencial_id: z.string().uuid().optional(),
  estoque_minimo: z.coerce.number().int().min(0).optional(),
});

// Schema para Cotações
export const cotacaoSchema = z.object({
  pedido_id: z.string().uuid('Pedido inválido'),
  fornecedor_id: z.string().uuid('Fornecedor inválido'),
  valor_total: z.coerce.number().positive(),
  prazo_entrega: z.coerce.number().int().positive().optional(),
  condicao_pagamento: z.string().optional(),
  validade: z.string().optional(),
  selecionada: z.coerce.boolean().default(false),
});

// Templates de importação
export const comprasImportTemplates = {
  pedidos: [
    { key: 'numero', label: 'Número', example: 'PC-2024-001' },
    { key: 'fornecedor_cnpj', label: 'CNPJ Fornecedor', example: '12.345.678/0001-90' },
    { key: 'data_pedido', label: 'Data Pedido', example: '2024-01-15' },
    { key: 'valor_total', label: 'Valor Total', example: '5000.00' },
    { key: 'status', label: 'Status', example: 'aprovado' },
  ],
  fornecedores: [
    { key: 'razao_social', label: 'Razão Social', example: 'Empresa LTDA' },
    { key: 'nome_fantasia', label: 'Nome Fantasia', example: 'Empresa' },
    { key: 'cnpj', label: 'CNPJ', example: '12.345.678/0001-90' },
    { key: 'email', label: 'E-mail', example: 'contato@empresa.com' },
    { key: 'telefone', label: 'Telefone', example: '(11) 99999-9999' },
    { key: 'cidade', label: 'Cidade', example: 'São Paulo' },
    { key: 'estado', label: 'UF', example: 'SP' },
  ],
  produtos: [
    { key: 'codigo', label: 'Código', example: 'PROD-001' },
    { key: 'nome', label: 'Nome', example: 'Caneta Personalizada' },
    { key: 'unidade', label: 'Unidade', example: 'UN' },
    { key: 'preco_unitario', label: 'Preço', example: '2.50' },
    { key: 'categoria', label: 'Categoria', example: 'Papelaria' },
  ],
};

// Configuração de filtros
export const comprasFilterConfigs = {
  pedidos: [
    { key: 'status', label: 'Status', type: 'select' as const, options: [
      { value: 'rascunho', label: 'Rascunho' },
      { value: 'aguardando_aprovacao', label: 'Aguardando Aprovação' },
      { value: 'aprovado', label: 'Aprovado' },
      { value: 'em_andamento', label: 'Em Andamento' },
      { value: 'entregue', label: 'Entregue' },
      { value: 'cancelado', label: 'Cancelado' },
    ]},
    { key: 'data_pedido', label: 'Data Pedido', type: 'dateRange' as const },
    { key: 'fornecedor_id', label: 'Fornecedor', type: 'select' as const, options: [] },
  ],
  fornecedores: [
    { key: 'ativo', label: 'Status', type: 'select' as const, options: [
      { value: 'true', label: 'Ativo' },
      { value: 'false', label: 'Inativo' },
    ]},
    { key: 'estado', label: 'Estado', type: 'text' as const },
    { key: 'categoria', label: 'Categoria', type: 'select' as const, options: [] },
  ],
};

export type PedidoCompra = z.infer<typeof pedidoCompraSchema>;
export type Fornecedor = z.infer<typeof fornecedorSchema>;
export type ProdutoCompra = z.infer<typeof produtoCompraSchema>;
export type Cotacao = z.infer<typeof cotacaoSchema>;
