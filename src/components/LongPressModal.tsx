import React from 'react';
import { Button } from "./ui/button"
import { Input } from "./ui/input"

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Dinner Attendance</h2>
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
        <div className="flex justify-end space-x-2">
          <Button onClick={() => onJoin(userPortions)}>
            Join
          </Button>
          <Button onClick={() => onTakeAway(userPortions)}>
            Take Away
          </Button>
          <Button onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LongPressModal;
