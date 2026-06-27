import { Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { PageLoader } from "./PageLoader";
import { warmTopRoutes } from "@/lib/routePrefetch";

export const Shell = () => {
  useEffect(() => {
    // Pre-warm likely-next route chunks during browser idle time.
    warmTopRoutes();
  }, []);

  return (
    <MainLayout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </MainLayout>
  );
};

