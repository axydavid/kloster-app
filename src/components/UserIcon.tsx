import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface User {
  id: string;
  email?: string;
  raw_user_meta_data?: {
    display_name?: string;
    iconColor?: string;
    [key: string]: any;
  };
}

interface UserIconProps {
  user: User;
  guests?: number;
  showRemoveButton?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  isTakeAway?: boolean;
  size?: 'small' | 'normal';
}

const UserIcon: React.FC<UserIconProps> = ({ user, guests = 0, showRemoveButton = false, onRemove, onClick, isTakeAway = false, size = 'normal' }) => {
  const displayName = user.raw_user_meta_data?.display_name || user.email?.split('@')[0] || user.id;
  const backgroundColor = user.raw_user_meta_data?.iconColor || user.raw_user_meta_data?.icon_color || '#007bff';

  const renderGuestIcon = (guestCount: number) => (
    <div
      className={`${size === 'small' ? 'w-6 h-6' : 'w-8 h-8 md:w-12 md:h-12'} rounded-full flex items-center justify-center text-white font-bold overflow-hidden ${size === 'small' ? 'text-xs' : 'text-xs md:text-base'}`}
      style={{ backgroundColor: '#007bff' }}
      title={`${guestCount} Guest${guestCount > 1 ? 's' : ''}`}
    >
      {guestCount}G
    </div>
  );

  return (
    <div className="relative group" onClick={onClick}>
      {user.id === 'guest' ? (
        renderGuestIcon(guests)
      ) : (
        <div
          className={`${size === 'small' ? 'w-6 h-6 text-xs' : 'w-8 h-8 md:w-12 md:h-12 text-xs md:text-lg'} rounded-full flex items-center justify-center text-white font-bold overflow-hidden relative ${isTakeAway ? 'border-2 border-dashed border-gray-400 opacity-70' : ''}`}
          style={{ backgroundColor }}
          title={`${displayName}${isTakeAway ? ' (Take-away)' : ''}`}
        >
          {displayName.slice(0, 2).toUpperCase()}
          {isTakeAway && (
            <div className="absolute bottom-0 left-0 bg-white rounded-full p-1">
              <ShoppingBag size={size === 'small' ? 10 : 14} className="text-gray-600" />
            </div>
          )}
        </div>
      )}
      {guests > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 md:w-6 md:h-6 flex items-center justify-center text-xs">
          {guests}
        </div>
      )}
      {showRemoveButton && (
        <div
          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 md:w-6 md:h-6 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (onRemove) onRemove();
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 md:w-4 md:h-4">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      )}
    </div>
  );
};

export default UserIcon;
