import React, { createContext, useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import UserMenu from './UserMenu';
import { Button } from "./ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet"
import { LayoutDashboard, UtensilsCrossed, WashingMachine, Wallet, Calculator, Menu, BedDouble } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { ReactComponent as Logo } from '../icons/logo.svg';
import { isDeletedUser } from '../utils/users';
import { cn } from '../lib/utils';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

const updateDinnerDaysJob = async () => {
  const { data: users, error: usersError } = await supabase.rpc('get_all_users');
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  const today = new Date();
  const futureDate = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000);

  const { data: existingDay, error: fetchError } = await supabase
    .from('dinner_days')
    .select('attendants')
    .eq('date', futureDate.toISOString().split('T')[0])
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching future dinner day:', fetchError);
    return;
  }

  let attendants = existingDay?.attendants || [];

  for (const user of users) {
    if (isDeletedUser(user)) {
      continue;
    }
    if (user.raw_user_meta_data.joinDinners) {
      const dinnerDays = user.raw_user_meta_data.dinnerDays || {};
      const dayOfWeek = futureDate.toLocaleDateString('en-US', { weekday: 'long' });
      const daySettings = dinnerDays[dayOfWeek];

      const existingAttendantIndex = attendants.findIndex((a: any) => a.id === user.id);

      if (daySettings && (daySettings.status === 'always' || daySettings.status === 'takeaway')) {
        const displayName = user.raw_user_meta_data?.display_name || user.email?.split('@')[0];
        const iconColor = user.raw_user_meta_data?.iconColor;
        if (existingAttendantIndex !== -1) {
          attendants[existingAttendantIndex] = {
            ...attendants[existingAttendantIndex],
            portions: Number(daySettings.portions),
            isTakeAway: daySettings.status === 'takeaway',
            isAutomaticallySet: true,
            displayName,
            iconColor
          };
        } else {
          attendants.push({
            id: user.id,
            portions: Number(daySettings.portions),
            isTakeAway: daySettings.status === 'takeaway',
            isAutomaticallySet: true,
            displayName,
            iconColor
          });
        }
      } else if (existingAttendantIndex !== -1 && attendants[existingAttendantIndex].isAutomaticallySet) {
        // Remove the user if they were automatically set but the new setting is 'never'
        attendants.splice(existingAttendantIndex, 1);
      }
    }
  }

  const { error: upsertError } = await supabase
    .from('dinner_days')
    .upsert({ date: futureDate.toISOString().split('T')[0], attendants });

  if (upsertError) {
    console.error('Error updating future dinner day:', upsertError);
  }
};

// Set up the job to run at midnight
const setupDinnerDaysJob = () => {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // the next day
    0, 0, 0 // at 00:00:00 hours
  );
  const msToMidnight = night.getTime() - now.getTime();

  setTimeout(() => {
    updateDinnerDaysJob();
    // Then set it to run every 24 hours
    setInterval(updateDinnerDaysJob, 24 * 60 * 60 * 1000);
  }, msToMidnight);
};

export interface UserData {
  id: string;
  type?: string;
  raw_user_meta_data: {
    display_name?: string;
    iconColor?: string;
    portions?: number;
    default_days?: {
      [key: number]: 'always' | 'never' | 'default' | 'takeaway';
    };
    [key: string]: any;
  };
}

export const UserContext = createContext<UserData[]>([]);
export const RefreshUsersContext = createContext<() => Promise<void>>(async () => {});

interface LayoutProps {
  session: Session | null;
  isAdmin: boolean;
}

const Layout: React.FC<LayoutProps> = ({ session, isAdmin }) => {
  const location = useLocation();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchAllUsers = useCallback(async () => {
    // IMPORTANT: This uses a custom RPC function to fetch users. Do not change to use a "users" table.
    const { data, error } = await supabase.rpc('get_all_users');
    if (error) {
      console.error('Error fetching all users:', error);
    } else {
      setUsers(data || []);
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
    setupDinnerDaysJob(); // Set up the job to run at midnight
  }, [fetchAllUsers]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    document.body.style.pointerEvents = '';
    document.body.style.overflow = '';
  }, [location.pathname]);

  // Note: Do not change this to use a "users" table. We're using Supabase Auth for user data.

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/dinner', label: 'Dinner', icon: UtensilsCrossed },
    { to: '/washing', label: 'Washing', icon: WashingMachine },
    { to: '/guest-room', label: 'Guest Room', icon: BedDouble },
    { to: '/budget', label: 'Budget', icon: Wallet },
    ...(isAdmin ? [{ to: '/accounting', label: 'Accounting', icon: Calculator }] : []),
  ];

  const NavItems = ({ onClick, stacked = false }: { onClick?: () => void; stacked?: boolean }) => (
    <>
      {navItems.map(({ to, label, icon: Icon }) => (
        <Button
          key={to}
          variant={isActive(to) ? 'secondary' : 'ghost'}
          asChild
          className={cn(stacked && 'w-full justify-start')}
          onClick={onClick}
        >
          <Link to={to} className="flex items-center">
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Link>
        </Button>
      ))}
    </>
  );

  return (
    <UserContext.Provider value={users}>
    <RefreshUsersContext.Provider value={fetchAllUsers}>
      <div className="flex flex-col min-h-screen bg-background font-sans antialiased">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>KlosterApp</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1">
                  <NavItems stacked onClick={() => setIsMobileMenuOpen(false)} />
                </nav>
              </SheetContent>
            </Sheet>
            <Link to="/" className="hidden items-center space-x-2 md:flex">
              <Logo className="h-7 w-auto fill-foreground" />
              <span className="font-bold">KlosterApp</span>
            </Link>
          </div>
          <div className="flex items-center justify-center">
            <Link to="/" className="flex items-center space-x-2 md:hidden">
              <Logo className="h-7 w-auto fill-foreground" />
              <span className="font-bold">KlosterApp</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavItems />
            </nav>
          </div>
          <div className="flex items-center justify-end">
            {session && <UserMenu session={session} isAdmin={isAdmin} />}
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto mt-8 p-4 px-0 sm:px-4">
        <Outlet />
      </main>
      <footer className="border-t bg-background p-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} KlosterApp
      </footer>
    </div>
    </RefreshUsersContext.Provider>
  </UserContext.Provider>
  );
};

export default Layout;
