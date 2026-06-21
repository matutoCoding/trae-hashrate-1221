import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Queue from '@/pages/Queue';
import Rooms from '@/pages/Rooms';
import LoadBalance from '@/pages/LoadBalance';
import Billing from '@/pages/Billing';
import MedicalRecords from '@/pages/MedicalRecords';
import Bills from '@/pages/Bills';
import Settings from '@/pages/Settings';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="queue" element={<Queue />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="load-balance" element={<LoadBalance />} />
          <Route path="billing" element={<Billing />} />
          <Route path="medical-records" element={<MedicalRecords />} />
          <Route path="bills" element={<Bills />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
