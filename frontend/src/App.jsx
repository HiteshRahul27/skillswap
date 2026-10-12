import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { ProtectedRoute, GuestRoute } from './components/layout/Guards';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import SkillDetail from './pages/SkillDetail';
import MySkills from './pages/MySkills';
import SkillForm from './pages/SkillForm';
import Bookings from './pages/Bookings';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

const guard = (el, admin) => <ProtectedRoute admin={admin}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/skills/:id" element={<SkillDetail />} />
        <Route path="/u/:id" element={<PublicProfile />} />
        <Route path="/dashboard" element={guard(<Dashboard />)} />
        <Route path="/teach" element={guard(<MySkills />)} />
        <Route path="/teach/new" element={guard(<SkillForm />)} />
        <Route path="/teach/:id/edit" element={guard(<SkillForm />)} />
        <Route path="/bookings" element={guard(<Bookings />)} />
        <Route path="/wallet" element={guard(<Wallet />)} />
        <Route path="/profile" element={guard(<Profile />)} />
        <Route path="/admin" element={guard(<Admin />, true)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
