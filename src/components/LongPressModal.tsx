import React, { useEffect, useCallback } from 'react';
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Users, ShoppingBag } from 'lucide-react';

interface LongPressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (portions: number) => void;
  onTakeAway: (portions: number) => void;
  initialPortions: number;
}

const LongPressModal: React.FC<LongPressModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  onTakeAway,
  initialPortions,
}) => {
  const [userPortions, setUserPortions] = React.useState(initialPortions);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Custom Join</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mb-4">
          <label htmlFor="portions" className="block text-sm font-medium text-gray-700">
            Portions
          </label>
          <Input
            type="number"
            id="portions"
            value={userPortions}
            onChange={(e) => setUserPortions(Number(e.target.value))}
            min={1}
            className="mt-1"
          />
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
