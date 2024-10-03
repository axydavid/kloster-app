import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Settings, ShieldCheck, LogOut } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

interface UserIconProps {
  session: Session;
}

const UserIcon: React.FC<UserIconProps> = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const user = session.user;
  const displayName = user.user_metadata.name || user.email;
  const initials = displayName.slice(0, 2).toUpperCase();
  const backgroundColor = user.user_metadata.iconColor || '#007bff';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold cursor-pointer"
          style={{ backgroundColor }}
        >
          {initials}
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
          <Button variant="ghost" asChild className="justify-start" onClick={() => setIsOpen(false)}>
            <Link to="/admin" className="flex items-center w-full px-2 py-1.5">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </Button>
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

export default UserIcon;
