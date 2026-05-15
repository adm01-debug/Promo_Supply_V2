import { MainLayout } from '@/features/layout/components/MainLayout';
import { ExecutiveDashboard } from '@/components/compras/ExecutiveDashboard';
import { OnboardingTour, useOnboardingTour, dashboardTourSteps } from '@/components/onboarding/OnboardingTour';
import { withModuleErrorBoundary } from '@/features/layout/components/ModuleErrorBoundary';

const DashboardExecutivo = () => {
  const { isOpen, complete, skip } = useOnboardingTour('dashboard-executivo');

  return (
    <MainLayout>
      <ExecutiveDashboard />
      <OnboardingTour
        steps={dashboardTourSteps}
        isOpen={isOpen}
        onComplete={complete}
        onSkip={skip}
      />
    </MainLayout>
  );
};

export default withModuleErrorBoundary(DashboardExecutivo, 'dashboard');
