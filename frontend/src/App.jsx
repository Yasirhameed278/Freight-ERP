import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import PortalHome from './pages/portal/PortalHome';
import QuoteView from './pages/portal/QuoteView';
import Tasks from './pages/Tasks';
import WorkflowRules from './pages/WorkflowRules';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import ShipmentForm from './pages/ShipmentForm';
import Analytics from './pages/Analytics';
import SalesSummary from './pages/SalesSummary';
import ARPortal from './pages/ARPortal';
import APPortal from './pages/APPortal';
import Collections from './pages/Collections';
import UserManagement from './pages/UserManagement';
import GL from './pages/GL';
import { ClientsList, Client360 } from './pages/Clients';
import RateSearch from './pages/RateSearch';
import Invoices from './pages/Invoices';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import { useAuth } from './context/AuthContext';

const HomeRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'customer' ? '/shipments' : '/dashboard'} replace />;
};

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public portal — no auth required */}
      <Route path="/portal"              element={<PortalHome />} />
      <Route path="/portal/quote/:token" element={<QuoteView />} />

      <Route path="/login"    element={isAuthenticated ? <HomeRedirect /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <HomeRedirect /> : <Register />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>

        {/* Dashboard */}
        <Route path="/dashboard" element={
          <RoleRoute roles={['admin', 'manager', 'sales', 'operations', 'finance', 'customer_service']}>
            <Dashboard />
          </RoleRoute>
        } />

        {/* Analytics */}
        <Route path="/analytics" element={
          <RoleRoute roles={['admin', 'manager', 'finance', 'operations']}>
            <Analytics />
          </RoleRoute>
        } />

        <Route path="/sales-summary" element={
          <RoleRoute roles={['admin', 'manager', 'finance']}>
            <SalesSummary />
          </RoleRoute>
        } />

        {/* Operations */}
        <Route path="/pipeline" element={
          <RoleRoute roles={['admin', 'manager', 'sales', 'operations', 'customer_service']}>
            <Kanban />
          </RoleRoute>
        } />

        <Route path="/shipments"          element={<Shipments />} />
        <Route path="/shipments/new"      element={
          <RoleRoute roles={['admin', 'manager', 'operations', 'sales', 'customer_service']}>
            <ShipmentForm />
          </RoleRoute>
        } />
        <Route path="/shipments/:id"      element={<ShipmentDetail />} />
        <Route path="/shipments/:id/edit" element={
          <RoleRoute roles={['admin', 'manager', 'operations', 'sales', 'customer_service']}>
            <ShipmentForm />
          </RoleRoute>
        } />

        {/* Finance */}
        <Route path="/invoices" element={<Invoices />} />

        <Route path="/ar-portal" element={
          <RoleRoute roles={['admin', 'manager', 'finance']}>
            <ARPortal />
          </RoleRoute>
        } />

        <Route path="/ap-portal" element={
          <RoleRoute roles={['admin', 'manager', 'finance']}>
            <APPortal />
          </RoleRoute>
        } />

        <Route path="/collections" element={
          <RoleRoute roles={['admin', 'manager', 'finance']}>
            <Collections />
          </RoleRoute>
        } />

        <Route path="/users" element={
          <RoleRoute roles={['admin', 'manager']}>
            <UserManagement />
          </RoleRoute>
        } />

        <Route path="/gl" element={
          <RoleRoute roles={['admin', 'manager', 'finance']}>
            <GL />
          </RoleRoute>
        } />

        {/* CRM */}
        <Route path="/clients" element={
          <RoleRoute roles={['admin', 'manager', 'sales', 'operations', 'customer_service', 'finance']}>
            <ClientsList />
          </RoleRoute>
        } />
        <Route path="/clients/:id" element={
          <RoleRoute roles={['admin', 'manager', 'sales', 'operations', 'customer_service', 'finance']}>
            <Client360 />
          </RoleRoute>
        } />

        {/* Rates */}
        <Route path="/rates" element={
          <RoleRoute roles={['admin', 'manager', 'sales', 'operations']}>
            <RateSearch />
          </RoleRoute>
        } />

        {/* Workflow & Tasks */}
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/workflows" element={
          <RoleRoute roles={['admin', 'manager', 'sales', 'operations', 'finance', 'customer_service']}>
            <WorkflowRules />
          </RoleRoute>
        } />

      </Route>

      <Route path="/" element={isAuthenticated ? <HomeRedirect /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
