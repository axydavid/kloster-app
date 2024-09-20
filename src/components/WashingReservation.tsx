import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

const WashingReservation: React.FC = () => {
  const [hours, setHours] = useState(1);
  const [hasWorkSchedule, setHasWorkSchedule] = useState(false);
  const [washingCount, setWashingCount] = useState(1);
  const [dryingCount, setDryingCount] = useState(1);

  const handleReservation = async () => {
    // Implement reservation logic
  };

  return (
    <div>
      <h2>Washing Reservation</h2>
      <input
        type="number"
        value={hours}
        onChange={(e) => setHours(parseInt(e.target.value))}
        min={1}
      />
      <label>
        <input
          type="checkbox"
          checked={hasWorkSchedule}
          onChange={(e) => setHasWorkSchedule(e.target.checked)}
        />
        I have a work schedule
      </label>
      <div>
        <label>Washing: </label>
        <input
          type="number"
          value={washingCount}
          onChange={(e) => setWashingCount(parseInt(e.target.value))}
          min={1}
        />
      </div>
      <div>
        <label>Drying: </label>
        <input
          type="number"
          value={dryingCount}
          onChange={(e) => setDryingCount(parseInt(e.target.value))}
          min={1}
        />
      </div>
      <button onClick={handleReservation}>Reserve</button>
    </div>
  );
};

export default WashingReservation;
