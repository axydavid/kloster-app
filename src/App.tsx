import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { createClient, Session } from '@supabase/supabase-js';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Dinner from './components/Dinner';
import WashingReservation from './components/WashingReservation';
import AdminPage from './components/AdminPage';
import Layout from './components/Layout';
import UserSettings from './components/UserSettings';
import Budget from './components/Budget';
import GuestHospitality from './components/GuestHospitality';
import Users from './components/Users';
import Accounting from './components/Accounting';
import GuestRoom from './components/GuestRoom';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

interface UserData {
  id: string;
  type?: string;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkUserRole(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkUserRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('type')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      setIsAdmin(false);
    } else {
      setIsAdmin(data?.type === 'admin');
    }
  };

  const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
    if (!session) {
      return <Navigate to="/login" />;
    }
    if (!isAdmin) {
      return <Navigate to="/dashboard" />;
    }
    return <>{children}</>;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
        <Route element={<Layout session={session} />}>
          <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/dinner" element={session ? <Dinner /> : <Navigate to="/login" />} />
          <Route path="/washing" element={session ? <WashingReservation /> : <Navigate to="/login" />} />
          <Route path="/admin" element={
            <ProtectedAdminRoute>
              <AdminPage />
            </ProtectedAdminRoute>
          } />
          <Route path="/settings" element={session ? <UserSettings /> : <Navigate to="/login" />} />
          <Route path="/budget" element={session ? <Budget /> : <Navigate to="/login" />} />
          if (isAdmin) {
          <Route path="/accounting" element={
            <ProtectedAdminRoute>
              <Accounting />
            </ProtectedAdminRoute>
          } />
        }
          <Route path="/guest-room" element={session ? <GuestRoom /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
