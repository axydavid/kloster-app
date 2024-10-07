import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Settings, ShieldCheck, LogOut } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import UserIcon from './UserIcon';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

interface UserMenuProps {
  session: Session;
  isAdmin: boolean;
}

const UserMenu: React.FC<UserMenuProps> = ({ session, isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const user = session.user;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="cursor-pointer">
          <UserIcon user={user} size="normal" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-0">
        <div className="flex flex-col">
          <Button variant="ghost" asChild className="justify-start" onClick={() => setIsOpen(false)}>
            <Link to="/settings" className="flex items-center w-full px-2 py-1.5">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          {isAdmin && (
            <Button variant="ghost" asChild className="justify-start" onClick={() => setIsOpen(false)}>
              <Link to="/admin" className="flex items-center w-full px-2 py-1.5">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
          <Button variant="ghost" asChild className="justify-start cursor-pointer" onClick={handleLogout}>
            <div className="flex items-center w-full px-2 py-1.5">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </div>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UserMenu;
