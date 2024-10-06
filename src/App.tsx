import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { createClient, Session } from '@supabase/supabase-js';
import { UserData } from './components/Layout';
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

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUserAndSetAdmin = async (session: Session) => {
      const { data, error } = await supabase.rpc('get_all_users');
      if (error) {
        console.error('Error fetching all users:', error);
      } else if (data && session.user) {
        const currentUser = data.find((u: UserData) => u.id === session.user.id);
        setIsAdmin(currentUser?.type === 'admin');
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserAndSetAdmin(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserAndSetAdmin(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
        <Route element={<Layout session={session} isAdmin={isAdmin} />}>
          <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/dinner" element={session ? <Dinner /> : <Navigate to="/login" />} />
          <Route path="/washing" element={session ? <WashingReservation /> : <Navigate to="/login" />} />
          <Route path="/admin" element={session && isAdmin ? <AdminPage /> : <Navigate to="/dashboard" />} />
          <Route path="/settings" element={session ? <UserSettings /> : <Navigate to="/login" />} />
          <Route path="/budget" element={session ? <Budget isAdmin={isAdmin} /> : <Navigate to="/login" />} />
          <Route path="/accounting" element={session && isAdmin ? <Accounting /> : <Navigate to="/dashboard" />} />
          <Route path="/guest-room" element={session ? <GuestRoom /> : <Navigate to="/login" />} />
          <Route path="/guest-hospitality" element={session ? <GuestHospitality /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
