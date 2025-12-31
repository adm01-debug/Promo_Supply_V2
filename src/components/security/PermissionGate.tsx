import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';

interface PermissionGateProps {
  children: ReactNode;
  module: string;
  action: string;
  fallback?: ReactNode;
  requireAll?: { module: string; action: string }[];
  requireAny?: { module: string; action: string }[];
}

export const PermissionGate = ({
  children,
  module,
  action,
  fallback = null,
  requireAll,
  requireAny,
}: PermissionGateProps) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission, isLoading } = usePermissions();
  const { isAdmin } = useAuth();

  // Admin bypasses all permission checks
  if (isAdmin) {
    return <>{children}</>;
  }

  // Still loading permissions
  if (isLoading) {
    return null;
  }

  // Check multiple permissions with AND logic
  if (requireAll && requireAll.length > 0) {
    if (!hasAllPermissions(requireAll)) {
      return <>{fallback}</>;
    }
  }

  // Check multiple permissions with OR logic
  if (requireAny && requireAny.length > 0) {
    if (!hasAnyPermission(requireAny)) {
      return <>{fallback}</>;
    }
  }

  // Check single permission
  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// HOC for wrapping components with permission check
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  module: string,
  action: string,
  FallbackComponent?: React.ComponentType
) {
  return function PermissionWrapper(props: P) {
    return (
      <PermissionGate
        module={module}
        action={action}
        fallback={FallbackComponent ? <FallbackComponent /> : null}
      >
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}
