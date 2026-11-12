import { describe, it, expect } from 'vitest';
import { statusConfig, typeConfig, getEventsForDay } from '../deliveryCalendarHelpers';
import type { DeliveryEvent } from '../deliveryCalendarHelpers';

vi.mock('lucide-react', () => ({
  Clock: {},
  Truck: {},
  CheckCircle2: {},
  AlertTriangle: {},
  Package: {},
  MapPin: {},
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [] }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

// ─── statusConfig ─────────────────────────────────────────────────────────────

describe('statusConfig', () => {
  const statuses = ['scheduled', 'in_transit', 'delivered', 'delayed'] as const;

  it('has 4 status entries', () => {
    expect(Object.keys(statusConfig)).toHaveLength(4);
  });

  it.each(statuses)('has entry for %s', (status) => {
    expect(statusConfig).toHaveProperty(status);
  });

  it('each entry has label, color, textColor, and icon', () => {
    statuses.forEach(s => {
      expect(typeof statusConfig[s].label).toBe('string');
      expect(typeof statusConfig[s].color).toBe('string');
      expect(typeof statusConfig[s].textColor).toBe('string');
      expect(statusConfig[s].icon).toBeTruthy();
    });
  });

  it('scheduled label is "Agendado"', () => {
    expect(statusConfig.scheduled.label).toBe('Agendado');
  });

  it('in_transit label is "Em Trânsito"', () => {
    expect(statusConfig.in_transit.label).toBe('Em Trânsito');
  });

  it('delivered label is "Entregue"', () => {
    expect(statusConfig.delivered.label).toBe('Entregue');
  });

  it('delayed label is "Atrasado"', () => {
    expect(statusConfig.delayed.label).toBe('Atrasado');
  });

  it('delivered color contains success', () => {
    expect(statusConfig.delivered.color).toContain('success');
  });

  it('delayed color contains destructive', () => {
    expect(statusConfig.delayed.color).toContain('destructive');
  });
});

// ─── typeConfig ───────────────────────────────────────────────────────────────

describe('typeConfig', () => {
  const types = ['delivery', 'pickup', 'partial'] as const;

  it('has 3 type entries', () => {
    expect(Object.keys(typeConfig)).toHaveLength(3);
  });

  it.each(types)('has entry for %s', (type) => {
    expect(typeConfig).toHaveProperty(type);
  });

  it('each entry has label and icon', () => {
    types.forEach(t => {
      expect(typeof typeConfig[t].label).toBe('string');
      expect(typeConfig[t].icon).toBeTruthy();
    });
  });

  it('delivery label is "Entrega"', () => {
    expect(typeConfig.delivery.label).toBe('Entrega');
  });

  it('pickup label is "Coleta"', () => {
    expect(typeConfig.pickup.label).toBe('Coleta');
  });

  it('partial label is "Parcial"', () => {
    expect(typeConfig.partial.label).toBe('Parcial');
  });
});

// ─── getEventsForDay ──────────────────────────────────────────────────────────

const makeEvent = (dateStr: string, overrides: Partial<DeliveryEvent> = {}): DeliveryEvent => ({
  id: '1',
  orderId: 'OC-001',
  product: 'Produto A',
  supplier: 'Fornecedor X',
  quantity: 10,
  date: new Date(dateStr),
  status: 'scheduled',
  type: 'delivery',
  ...overrides,
});

describe('getEventsForDay', () => {
  it('returns events matching the given day', () => {
    const events = [
      makeEvent('2024-06-15T10:00:00'),
      makeEvent('2024-06-15T14:00:00'),
      makeEvent('2024-06-16T09:00:00'),
    ];
    const result = getEventsForDay(events, new Date(2024, 5, 15));
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no events match', () => {
    const events = [makeEvent('2024-06-15T10:00:00')];
    const result = getEventsForDay(events, new Date(2024, 5, 20));
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(getEventsForDay([], new Date(2024, 5, 15))).toHaveLength(0);
  });

  it('returns all events when all match the day', () => {
    const events = [
      makeEvent('2024-12-25T00:00:00'),
      makeEvent('2024-12-25T12:00:00'),
      makeEvent('2024-12-25T23:59:00'),
    ];
    const result = getEventsForDay(events, new Date(2024, 11, 25));
    expect(result).toHaveLength(3);
  });

  it('does not return events from adjacent days', () => {
    const events = [
      makeEvent('2024-06-14T23:59:00'),
      makeEvent('2024-06-15T00:00:00'),
      makeEvent('2024-06-16T00:00:00'),
    ];
    const result = getEventsForDay(events, new Date(2024, 5, 15));
    expect(result).toHaveLength(1);
  });

  it('preserves all fields of matching events', () => {
    const event = makeEvent('2024-06-15T10:00:00', { id: 'test-id', status: 'delivered', type: 'pickup' });
    const result = getEventsForDay([event], new Date(2024, 5, 15));
    expect(result[0].id).toBe('test-id');
    expect(result[0].status).toBe('delivered');
    expect(result[0].type).toBe('pickup');
  });
});
