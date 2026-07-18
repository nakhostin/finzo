import { createBrowserRouter, createHashRouter } from "react-router";
import { Layout } from "@/components/Layout";
import { DashboardPage } from "@/features/dashboard";
import { RecurringItemsPage } from "@/features/recurring-items";
import { ChecklistPage } from "@/features/recurring-items/ChecklistPage";
import { ChequesPage } from "@/features/cheques";
import { PeoplePage } from "@/features/people";
import { PersonDetail } from "@/features/people/PersonDetail";
import { AssetsPage } from "@/features/assets";
import { AssetDetail } from "@/features/assets/AssetDetail";
import { ShoppingPage } from "@/features/shopping";
import { VehiclePage } from "@/features/vehicle";
import { ReportsPage } from "@/features/reports";
import { SettingsPage } from "@/features/settings";

const routes = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "checklist", element: <ChecklistPage /> },
      { path: "recurring", element: <RecurringItemsPage /> },
      { path: "cheques", element: <ChequesPage /> },
      { path: "people", element: <PeoplePage /> },
      { path: "people/:id", element: <PersonDetail /> },
      { path: "assets", element: <AssetsPage /> },
      { path: "assets/:id", element: <AssetDetail /> },
      { path: "shopping", element: <ShoppingPage /> },
      { path: "vehicle", element: <VehiclePage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
];

function shouldUseHashRouter() {
  if (__IS_ELECTRON__) return true;
  if (typeof window === "undefined") return false;
  return (
    window.electron?.isElectron === true ||
    window.location.protocol === "file:"
  );
}

export const router = shouldUseHashRouter()
  ? createHashRouter(routes)
  : createBrowserRouter(routes);
