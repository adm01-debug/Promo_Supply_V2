import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PipelineChart } from '../PipelineChart';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockData = {
  solicitacao: 100,
  cotacao: 80,
  pedido: 60,
  pagamento: 50,
  transito: 40,
  entregue: 30,
};

const mockPreviousData = {
  solicitacao: 80,
  cotacao: 60,
  pedido: 40,
  pagamento: 30,
  transito: 20,
  entregue: 10,
};

describe('PipelineChart', () => {
  it('should render correct values for each stage', () => {
    render(
      <TooltipProvider>
        <PipelineChart data={mockData} previousData={mockPreviousData} />
      </TooltipProvider>
    );

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('should calculate conversion rates correctly', () => {
    render(
      <TooltipProvider>
        <PipelineChart data={mockData} previousData={mockPreviousData} />
      </TooltipProvider>
    );

    // 80/100 = 80%
    const conversionRates = screen.getAllByText('80%');
    expect(conversionRates.length).toBeGreaterThan(0);
    
    // Overall conversion in code: totalCompleted / (totalActive + totalCompleted)
    // 30 / 360 = ~8%
    expect(screen.getByText('8% conclusão')).toBeInTheDocument();
  });

  it('should display narrative summary', () => {
    render(
      <TooltipProvider>
        <PipelineChart data={mockData} previousData={mockPreviousData} />
      </TooltipProvider>
    );

    expect(screen.getByText(/De 100 solicitações/)).toBeInTheDocument();
    expect(screen.getByText(/80% avançam para cotação/)).toBeInTheDocument();
  });
});
