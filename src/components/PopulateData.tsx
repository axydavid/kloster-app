import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

const PopulateData: React.FC = () => {
  const populateDinnerDays = async () => {
    const sampleDinnerDays = [
      { date: '2024-02-01', cook: 'John Doe', menu: ['Pasta', 'Salad'], participants: ['John', 'Jane', 'Bob'] },
      { date: '2024-02-02', cook: 'Jane Smith', menu: ['Pizza', 'Garlic Bread'], participants: ['Jane', 'Bob', 'Alice'] },
      { date: '2024-02-03', cook: 'Bob Johnson', menu: ['Tacos', 'Rice'], participants: ['Bob', 'Alice', 'Charlie'] },
    ];

    const { data, error } = await supabase.from('dinner_days').insert(sampleDinnerDays);
    if (error) {
      console.error('Error populating dinner days:', error);
    } else {
      console.log('Dinner days populated successfully');
    }
  };

  const populateBudgets = async () => {
    const sampleBudget = {
      per_person: 10,
      per_meal: 30,
      per_washing: 5,
      per_drying: 3,
    };

    const { data, error } = await supabase.from('budgets').insert(sampleBudget);
    if (error) {
      console.error('Error populating budgets:', error);
    } else {
      console.log('Budgets populated successfully');
    }
  };

  const populateMessages = async () => {
    const sampleMessages = [
      { content: 'Welcome to the Kloster App!', created_at: new Date().toISOString() },
      { content: 'Remember to sign up for dinner duty.', created_at: new Date().toISOString() },
      { content: 'Laundry room is open 24/7.', created_at: new Date().toISOString() },
    ];

    const { data, error } = await supabase.from('messages').insert(sampleMessages);
    if (error) {
      console.error('Error populating messages:', error);
    } else {
      console.log('Messages populated successfully');
    }
  };

  return (
    <div>
      <h2>Populate Data</h2>
      <button onClick={populateDinnerDays}>Populate Dinner Days</button>
      <button onClick={populateBudgets}>Populate Budgets</button>
      <button onClick={populateMessages}>Populate Messages</button>
    </div>
  );
};

export default PopulateData;
