import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

const AdminPage: React.FC = () => {
  const [budgetPerPerson, setBudgetPerPerson] = useState(0);
  const [budgetPerMeal, setBudgetPerMeal] = useState(0);
  const [budgetPerWashing, setBudgetPerWashing] = useState(0);
  const [budgetPerDrying, setBudgetPerDrying] = useState(0);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    const { data, error } = await supabase.from('budgets').select('*').single();
    if (error) {
      console.error('Error fetching budgets:', error);
    } else {
      setBudgetPerPerson(data.per_person);
      setBudgetPerMeal(data.per_meal);
      setBudgetPerWashing(data.per_washing);
      setBudgetPerDrying(data.per_drying);
    }
  };

  const updateBudgets = async () => {
    const { error } = await supabase.from('budgets').upsert({
      per_person: budgetPerPerson,
      per_meal: budgetPerMeal,
      per_washing: budgetPerWashing,
      per_drying: budgetPerDrying,
    });

    if (error) {
      console.error('Error updating budgets:', error);
    } else {
      alert('Budgets updated successfully');
    }
  };

  return (
    <div>
      <h2>Admin Page</h2>
      <div>
        <label>Budget per person: </label>
        <input
          type="number"
          value={budgetPerPerson}
          onChange={(e) => setBudgetPerPerson(parseFloat(e.target.value))}
        />
      </div>
      <div>
        <label>Budget per meal: </label>
        <input
          type="number"
          value={budgetPerMeal}
          onChange={(e) => setBudgetPerMeal(parseFloat(e.target.value))}
        />
      </div>
      <div>
        <label>Budget per washing: </label>
        <input
          type="number"
          value={budgetPerWashing}
          onChange={(e) => setBudgetPerWashing(parseFloat(e.target.value))}
        />
      </div>
      <div>
        <label>Budget per drying: </label>
        <input
          type="number"
          value={budgetPerDrying}
          onChange={(e) => setBudgetPerDrying(parseFloat(e.target.value))}
        />
      </div>
      <button onClick={updateBudgets}>Update Budgets</button>
    </div>
  );
};

export default AdminPage;
