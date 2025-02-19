import React, { useEffect, useCallback } from 'react';
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Users, ShoppingBag, Utensils } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

interface LongPressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (portions: number) => void;
  onTakeAway: (portions: number) => void;
}

const LongPressModal: React.FC<LongPressModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  onTakeAway,
}) => {
  const [userPortions, setUserPortions] = React.useState(1);
  const [initialPortionsLoaded, setInitialPortionsLoaded] = React.useState(false);

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
          <h2 className="text-xl font-bold mr-2">Custom Join</h2>
          <div className="flex items-center">
            <div className="relative mr-4">
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
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex justify-center space-x-4">
          <Button 
            onClick={() => onJoin(userPortions)}
            className="flex-1 h-16 bg-blue-500 hover:bg-blue-600"
          >
            <Users className="mr-2" />
            Join
          </Button>
          <Button 
            onClick={() => onTakeAway(userPortions)}
            className="flex-1 h-16 bg-green-500 hover:bg-green-600"
          >
            <ShoppingBag className="mr-2" />
            Take Away
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LongPressModal;
