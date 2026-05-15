import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { PageLoader } from "./PageLoader";

export const Shell = () => {
  return (
    <MainLayout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </MainLayout>
  );
};
