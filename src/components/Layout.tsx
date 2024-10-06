import React, { createContext, useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import UserIcon from './UserIcon';
import { Button } from "./ui/button"
import { LayoutDashboard, UtensilsCrossed, WashingMachine, ShieldCheck, Wallet, Calculator, Menu, X, BedDouble } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { ReactComponent as Logo } from '../icons/logo.svg';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

export interface UserData {
  id: string;
  type?: string;
  raw_user_meta_data?: {
    display_name?: string;
    iconColor?: string;
    [key: string]: any;
  };
}

export const UserContext = createContext<UserData[]>([]);

interface LayoutProps {
  session: Session | null;
  isAdmin: boolean;
}

const Layout: React.FC<LayoutProps> = ({ session, isAdmin }) => {
  const location = useLocation();
  const [users, setUsers] = useState<UserData[]>([]);
  const [logoColor, setLogoColor] = useState('#ffffff'); // Default color
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchAllUsers = async () => {
      const { data, error } = await supabase.rpc('get_all_users');
      if (error) {
        console.error('Error fetching all users:', error);
      } else {
        setUsers(data || []);
      }
    };

    fetchAllUsers();
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path ? "bg-primary-foreground text-primary" : "";
  };

  const NavItems = ({ isAdmin, isActive, onClick }: { isAdmin: boolean, isActive: (path: string) => string, onClick?: () => void }) => (
    <>
      <Button variant="ghost" asChild className={`w-full justify-start ${isActive("/dashboard")}`} onClick={onClick}>
        <Link to="/dashboard" className="flex items-center">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </Link>
      </Button>
      <Button variant="ghost" asChild className={`w-full justify-start ${isActive("/dinner")}`} onClick={onClick}>
        <Link to="/dinner" className="flex items-center">
          <UtensilsCrossed className="mr-2 h-4 w-4" />
          Dinner
        </Link>
      </Button>
      <Button variant="ghost" asChild className={`w-full justify-start ${isActive("/washing")}`} onClick={onClick}>
        <Link to="/washing" className="flex items-center">
          <WashingMachine className="mr-2 h-4 w-4" />
          Washing
        </Link>
      </Button>
      <Button variant="ghost" asChild className={`w-full justify-start ${isActive("/guest-room")}`} onClick={onClick}>
        <Link to="/guest-room" className="flex items-center">
          <BedDouble className="mr-2 h-4 w-4" />
          Guest Room
        </Link>
      </Button>
      <Button variant="ghost" asChild className={`w-full justify-start ${isActive("/budget")}`} onClick={onClick}>
        <Link to="/budget" className="flex items-center">
          <Wallet className="mr-2 h-4 w-4" />
          Budget
        </Link>
      </Button>
      {isAdmin && (
        <Button variant="ghost" asChild className={`w-full justify-start ${isActive("/accounting")}`} onClick={onClick}>
          <Link to="/accounting" className="flex items-center">
            <Calculator className="mr-2 h-4 w-4" />
            Accounting
          </Link>
        </Button>
      )}
    </>
  );

  return (
    <UserContext.Provider value={users}>
      <div className="flex flex-col min-h-screen bg-background font-sans antialiased">
      <header className="bg-primary text-primary-foreground p-4 sm:p-4 p-2 relative">
        <div className="mx-4">
          <nav className="flex justify-between items-center">
            <div className="flex space-x-14">
              <Link to="/" className="flex items-center">
                <Logo className="h-8 w-auto" style={{ fill: logoColor }} />
              </Link>
              <Link to="/" className="text-2xl font-bold absolute" style={{ color: logoColor }}>KlosterApp</Link>
            </div>
            <div className="hidden md:flex space-x-2">
              <NavItems isAdmin={isAdmin} isActive={isActive} />
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
              {session && (
                <UserIcon session={session} isAdmin={isAdmin} />
              )}
            </div>
          </nav>
          {isMobileMenuOpen && (
            <nav className="md:hidden flex flex-col space-y-2 mt-4">
              <NavItems isAdmin={isAdmin} isActive={isActive} onClick={() => setIsMobileMenuOpen(false)} />
            </nav>
          )}
        </div>
      </header>
      <main className="flex-grow container mx-auto mt-8 p-4 px-0 sm:px-4">
        <Outlet />
      </main>
      <footer className="bg-primary text-primary-foreground p-4 text-center">
        © 2023 KlosterApp
      </footer>
    </div>
  </UserContext.Provider>
  );
};

export default Layout;
