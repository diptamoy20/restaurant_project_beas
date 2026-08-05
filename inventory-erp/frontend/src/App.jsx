import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { AdminLayout } from './layouts/AdminLayout';
import { RestaurantWorkspaceLayout } from './layouts/RestaurantWorkspaceLayout';
import { WarehouseWorkspaceLayout } from './layouts/WarehouseWorkspaceLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { IngredientMasterPage } from './pages/IngredientMasterPage';
import { UnitsPage } from './pages/UnitsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { WarehouseStockPage } from './pages/warehouse/WarehouseStockPage';
import { PurchaseOrdersPage } from './pages/warehouse/PurchaseOrdersPage';
import { GrnPage } from './pages/warehouse/GrnPage';
import { BranchStoreRequestsPage } from './pages/warehouse/BranchStoreRequestsPage';
import { OutboundTransfersPage } from './pages/warehouse/OutboundTransfersPage';
import { WarehouseReportsPage } from './pages/warehouse/WarehouseReportsPage';
import { ReturnsPage } from './pages/warehouse/ReturnsPage';
import { StockLedgerPage } from './pages/warehouse/StockLedgerPage';
import { StoreStockPage } from './pages/restaurant/StoreStockPage';
import { KitchenStockPage } from './pages/restaurant/KitchenStockPage';
import { KitchenRequestsPage } from './pages/restaurant/KitchenRequestsPage';
import { KitchenTransfersPage } from './pages/restaurant/KitchenTransfersPage';
import { ConsumptionPage } from './pages/restaurant/ConsumptionPage';
import { WasteManagementPage } from './pages/restaurant/WasteManagementPage';
import { ReportsPage as RestaurantReportsPage } from './pages/restaurant/ReportsPage';
import { StoreRequestsPage } from './pages/restaurant/StoreRequestsPage';
import { RecipesPage } from './pages/RecipesPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { BrandsPage } from './pages/BrandsPage';
import { TaxesPage } from './pages/TaxesPage';
import { WarehouseWorkspacePage } from './pages/WarehouseWorkspacePage';
import { RestaurantWorkspacePage } from './pages/RestaurantWorkspacePage';
import { WarehouseDashboardPage } from './pages/warehouse/WarehouseDashboardPage';
import { RestaurantDashboardPage } from './pages/restaurant/RestaurantDashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {/* Global routes */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/ingredients" element={<IngredientMasterPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/units" element={<UnitsPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/taxes" element={<TaxesPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Workspace launchers */}
          <Route path="/restaurants" element={<RestaurantWorkspacePage />} />
          <Route path="/warehouse" element={<WarehouseWorkspacePage />} />

          {/* Restaurant workspace — sidebar stays, workspace nav in content area */}
          <Route element={<RestaurantWorkspaceLayout />}>
            <Route path="/operations/:slug/dashboard" element={<RestaurantDashboardPage />} />
            <Route path="/operations/:slug/store-inventory" element={<StoreStockPage />} />
            <Route path="/operations/:slug/kitchen-inventory" element={<KitchenStockPage />} />
            <Route path="/operations/:slug/kitchen-requests" element={<KitchenRequestsPage />} />
            <Route path="/operations/:slug/kitchen-transfers" element={<KitchenTransfersPage />} />
            <Route path="/operations/:slug/store-requests" element={<StoreRequestsPage />} />
            <Route path="/operations/:slug/consumption" element={<ConsumptionPage />} />
            <Route path="/operations/:slug/waste" element={<WasteManagementPage />} />
            <Route path="/operations/:slug/reports" element={<RestaurantReportsPage />} />
          </Route>

          {/* Warehouse workspace — sidebar stays, workspace nav in content area */}
          <Route element={<WarehouseWorkspaceLayout />}>
            <Route path="/warehouse/dashboard" element={<WarehouseDashboardPage />} />
            <Route path="/warehouse/inventory" element={<WarehouseStockPage />} />
            <Route path="/warehouse/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/warehouse/grn" element={<GrnPage />} />
            <Route path="/warehouse/store-requests" element={<BranchStoreRequestsPage />} />
            <Route path="/warehouse/outbound-transfers" element={<OutboundTransfersPage />} />
            <Route path="/warehouse/reports" element={<WarehouseReportsPage />} />
            <Route path="/warehouse/returns" element={<ReturnsPage />} />
            <Route path="/warehouse/stock-ledger" element={<StockLedgerPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
