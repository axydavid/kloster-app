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

interface UserTagProps {
  user: User;
  portions?: number;
  isTakeAway?: boolean;
  showRemoveButton?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'small' | 'normal';
}

const UserTag: React.FC<UserTagProps> = ({ 
  user, 
  portions = 1, 
  isTakeAway = false, 
  showRemoveButton = false, 
  onRemove, 
  onClick,
  size = 'normal'
}) => {
  const displayName = user.raw_user_meta_data?.display_name || user.email?.split('@')[0] || user.id;
  const userColor = user.raw_user_meta_data?.iconColor || '#4F46E5';
  
  return (
    <div 
      onClick={onClick}
      className={`
        ${size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} 
        rounded-full font-bold text-white flex items-center gap-1 relative cursor-pointer
        ${isTakeAway ? 'border-2 border-dashed border-white opacity-70' : ''}
      `}
      style={{ backgroundColor: userColor }}
    >
      <span>{displayName}</span>
      {portions > 1 && <span>({portions})</span>}
      {isTakeAway && (
        <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md">
          <ShoppingBag size={size === 'small' ? 10 : 14} className="text-gray-600" />
        </div>
      )}
      {showRemoveButton && (
        <div
          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (onRemove) onRemove();
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      )}
    </div>
  );
};

export default UserTag;
