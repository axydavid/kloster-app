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

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
        <Route element={<Layout session={session} />}>
          <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/dinner" element={session ? <Dinner /> : <Navigate to="/login" />} />
          <Route path="/washing" element={session ? <WashingReservation /> : <Navigate to="/login" />} />
          <Route path="/admin" element={session ? <AdminPage /> : <Navigate to="/login" />} />
          <Route path="/settings" element={session ? <UserSettings /> : <Navigate to="/login" />} />
          <Route path="/budget" element={session ? <Budget /> : <Navigate to="/login" />} />
          <Route path="/accounting" element={session ? <Accounting /> : <Navigate to="/login" />} />
          <Route path="/guest-room" element={session ? <GuestRoom /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
