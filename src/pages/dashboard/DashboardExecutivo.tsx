import { ExecutiveDashboard } from '@/components/compras/ExecutiveDashboard';
import { OnboardingTour, useOnboardingTour, dashboardTourSteps } from '@/components/onboarding/OnboardingTour';
import { withModuleErrorBoundary } from '@/features/layout/components/ModuleErrorBoundary';
import { useRenderProfiler } from '@/hooks/useRenderProfiler';

const DashboardExecutivo = () => {
  const { isOpen, complete, skip } = useOnboardingTour('dashboard-executivo');
  useRenderProfiler('DashboardExecutivo');

  return (
    <>
      <ExecutiveDashboard />
      <OnboardingTour
        steps={dashboardTourSteps}
        isOpen={isOpen}
        onComplete={complete}
        onSkip={skip}
      />
    </>
  );
};

export default withModuleErrorBoundary(DashboardExecutivo, 'dashboard');
