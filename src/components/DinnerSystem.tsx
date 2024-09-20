import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

interface DinnerDay {
  id: number;
  date: string;
  cook: string;
  menu: string[];
  participants: string[];
}

const DinnerSystem: React.FC = () => {
  const [dinnerDays, setDinnerDays] = useState<DinnerDay[]>([]);

  useEffect(() => {
    fetchDinnerDays();
  }, []);

  const fetchDinnerDays = async () => {
    const { data, error } = await supabase
      .from('dinner_days')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching dinner days:', error);
    } else {
      setDinnerDays(data);
    }
  };

  const assignCook = async (dayId: number) => {
    // Implement cook assignment logic
  };

  const joinDinner = async (dayId: number) => {
    // Implement dinner joining logic
  };

  return (
    <div>
      <h2>Dinner System</h2>
      {dinnerDays.map((day) => (
        <div key={day.id}>
          <h3>{day.date}</h3>
          <p>Cook: {day.cook || 'Not assigned'}</p>
          <button onClick={() => assignCook(day.id)}>Assign as Cook</button>
          <p>Menu: {day.menu.join(', ')}</p>
          <p>Participants: {day.participants.join(', ')}</p>
          <button onClick={() => joinDinner(day.id)}>Join Dinner</button>
        </div>
      ))}
    </div>
  );
};

export default DinnerSystem;
