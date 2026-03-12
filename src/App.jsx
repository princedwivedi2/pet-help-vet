import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Appointments from './pages/Appointments/Appointments';
import VisitRecords from './pages/VisitRecords/VisitRecords';
import SosRequests from './pages/SOS/SosRequests';
import Wallet from './pages/Wallet/Wallet';
import Reviews from './pages/Reviews/Reviews';
import Profile from './pages/Profile/Profile';
import Notifications from './pages/Notifications/Notifications';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="visit-records" element={<VisitRecords />} />
        <Route path="sos" element={<SosRequests />} />
        <Route path="earnings" element={<Wallet />} />
        <Route path="wallet" element={<Navigate to="/earnings" replace />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
