import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { createClient, Session } from '@supabase/supabase-js';
import { UserData } from './components/Layout';
import { isAdminUser, isDeletedUser } from './utils/users';
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
import ForgotPassword from './components/ForgotPassword';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const signOutDeletedUser = async () => {
      await supabase.auth.signOut();
      setSession(null);
      setIsAdmin(false);
    };

    const fetchUserAndSetAdmin = async (nextSession: Session) => {
      if (isDeletedUser(nextSession.user)) {
        await signOutDeletedUser();
        return;
      }

      const { data, error } = await supabase.rpc('get_all_users');
      if (!isMounted) return;
      if (error) {
        console.error('Error fetching all users:', error);
        setIsAdmin(isAdminUser(nextSession.user));
        return;
      }
      if (data && nextSession.user) {
        const currentUser = data.find((u: UserData) => u.id === nextSession.user.id);
        if (isDeletedUser(currentUser)) {
          await signOutDeletedUser();
          return;
        }
        setIsAdmin(isAdminUser(currentUser) || isAdminUser(nextSession.user));
      }
    };

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!isMounted) return;
      setSession(currentSession);
      if (currentSession) {
        await fetchUserAndSetAdmin(currentSession);
      }
      if (isMounted) setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        fetchUserAndSetAdmin(nextSession);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={!session ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
        <Route element={<Layout session={session} isAdmin={isAdmin} />}>
          <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/dinner" element={session ? <Dinner /> : <Navigate to="/login" />} />
          <Route path="/washing" element={session ? <WashingReservation /> : <Navigate to="/login" />} />
          <Route path="/admin" element={session && isAdmin ? <AdminPage /> : <Navigate to="/dashboard" />} />
          <Route path="/settings" element={session ? <UserSettings /> : <Navigate to="/login" />} />
          <Route path="/budget" element={session ? <Budget isAdmin={isAdmin} /> : <Navigate to="/login" />} />
          <Route path="/accounting" element={session && isAdmin ? <Accounting /> : <Navigate to="/dashboard" />} />
          <Route path="/guest-room" element={session ? <GuestRoom /> : <Navigate to="/login" />} />
          <Route path="/guest-hospitality" element={session && isAdmin ? <GuestHospitality /> : <Navigate to="/dashboard" />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
