import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import LoginPage from './pages/LoginPage';
import TicketsPage from './pages/TicketsPage';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <h1>{title}</h1>
      <p className="muted">Pantalla en construcción.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/tickets/nuevo" element={<Placeholder title="Nuevo ticket" />} />
            <Route path="/tickets/:id" element={<Placeholder title="Detalle" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/tickets" replace />} />
      </Routes>
    </AuthProvider>
  );
}
