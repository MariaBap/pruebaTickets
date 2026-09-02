import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { FullPageLoader } from '../components/States';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mientras se valida el token no se puede decidir: redirigir aquí expulsaría
  // a alguien con sesión válida en cada recarga de página.
  if (loading) {
    return <FullPageLoader label="Comprobando la sesión..." />;
  }

  if (!user) {
    // Se recuerda a dónde iba para volver allí tras iniciar sesión.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
