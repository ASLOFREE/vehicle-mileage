import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import HomePage from '@/pages/HomePage/HomePage';
import VehiclesPage from '@/pages/VehiclesPage/VehiclesPage';
import FuelPage from '@/pages/FuelPage/FuelPage';
import ViolationsPage from '@/pages/ViolationsPage/ViolationsPage';
import RepairPage from '@/pages/RepairPage/RepairPage';
import AnalyticsPage from '@/pages/AnalyticsPage/AnalyticsPage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="fuel" element={<FuelPage />} />
        <Route path="violations" element={<ViolationsPage />} />
        <Route path="repair" element={<RepairPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
