import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginPage from './pages/LoginPage';
import ImportPage from './pages/ImportPage';
import RecipesPage from './pages/RecipesPage';
import SettingsPage from './pages/SettingsPage';
import MealPlanPage from './pages/MealPlanPage';
import PantryPage from './pages/PantryPage';

function Shell() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div className="center">Lädt…</div>;
  if (!user) return <LoginPage />;

  return (
    <div className="app">
      <nav>
        <span className="brand">
          <img src="/favicon.svg" alt="" />
          Essensplaner
        </span>
        <NavLink to="/recipes" className={({ isActive }) => (isActive ? 'active-link' : '')}>
          Rezepte
        </NavLink>
        <NavLink to="/import" className={({ isActive }) => (isActive ? 'active-link' : '')}>
          Import
        </NavLink>
        <NavLink to="/plan" className={({ isActive }) => (isActive ? 'active-link' : '')}>
          Wochenplan
        </NavLink>
        <NavLink to="/pantry" className={({ isActive }) => (isActive ? 'active-link' : '')}>
          Vorrat & Einkauf
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active-link' : '')}>
          Settings
        </NavLink>
        <button onClick={signOut}>Logout</button>
      </nav>
      <Routes>
        <Route path="/import" element={<ImportPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/plan" element={<MealPlanPage />} />
        <Route path="/pantry" element={<PantryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/recipes" />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}
