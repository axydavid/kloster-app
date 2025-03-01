import React, { useEffect, useCallback, useState } from 'react';
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Users, ShoppingBag, Utensils, UserPlus } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

interface LongPressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (portions: number) => void;
  onTakeAway: (portions: number) => void;
  onAddGuests: (guestCount: number) => void;
  initialGuestCount?: number;
}

const LongPressModal: React.FC<LongPressModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  onTakeAway,
  onAddGuests,
  initialGuestCount = 0
}) => {
  const [userPortions, setUserPortions] = useState(1);
  const [guestCount, setGuestCount] = useState(initialGuestCount);
  const [initialPortionsLoaded, setInitialPortionsLoaded] = useState(false);

  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, handleEscapeKey]);

  useEffect(() => {
    const fetchUserPortions = async () => {
      if (!initialPortionsLoaded) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase.rpc('get_user_metadata', { user_id: user.id });
          if (!error && data) {
            setUserPortions(data.portions || 1);
            setInitialPortionsLoaded(true);
          }
        }
      }
    };

    fetchUserPortions();
  }, [initialPortionsLoaded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Attendance Options</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Utensils className="text-gray-500 absolute left-2 top-1/2 transform -translate-y-1/2" />
              <Input
                type="number"
                id="portions"
                value={userPortions}
                onChange={(e) => setUserPortions(Number(e.target.value))}
                min={1}
                max={10}
                className="w-20 pl-8 pr-2 text-center bg-gray-100 text-gray-500 font-bold text-xl"
                onFocus={(e) => e.target.select()}
                style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
              />
            </div>
          </div>

          <div className="flex space-x-3 mb-5">
            <Button
              onClick={() => onJoin(userPortions)}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              <Users className="mr-2 h-4 w-4" />
              Join
            </Button>
            <Button
              onClick={() => onTakeAway(userPortions)}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Take Away
            </Button>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex justify-center mb-3">
              <div className="relative">
                <UserPlus className="text-gray-500 absolute left-2 top-1/2 transform -translate-y-1/2" />
                <Input
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                  min={0}
                  max={20}
                  className="w-20 pl-8 pr-2 text-center bg-gray-100 text-gray-500 font-bold text-xl"
                  onFocus={(e) => e.target.select()}
                  style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                />
              </div>
            </div>
            <Button
              onClick={() => {
                onAddGuests(guestCount);
                onClose();
              }}
              className="w-full bg-purple-500 hover:bg-purple-600"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Guests
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LongPressModal;
