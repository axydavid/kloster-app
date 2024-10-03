import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from '../utils/createClient';
import { UserContext } from './Layout';

interface BudgetEntry {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  description: string;
  created_at: string;
}

interface User {
  id: string;
  raw_user_meta_data?: {
    display_name?: string;
    iconColor?: string;
    [key: string]: any;
  };
}

const GuestHospitality: React.FC = () => {
  const users = useContext(UserContext);

  const [guestHospitalityFund, setGuestHospitalityFund] = useState<number>(0);
  const [guestHospitalityAmount, setGuestHospitalityAmount] = useState<string>('');
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState<boolean>(false);

  useEffect(() => {
    fetchGuestEntries();
  }, []);

  const fetchGuestEntries = async () => {
    const { data, error } = await supabase
      .from('guest_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching guest entries:', error);
      setError('Error fetching guest entries.');
      setShowError(true);
    } else {
      setBudgetEntries(data || []);
      const fundTotal = data.reduce((total, entry) => {
        return total + entry.amount;
      }, 0);
      setGuestHospitalityFund(fundTotal);
    }
  };

  const handleAddToGuestHospitalityFund = async () => {
    if (!guestHospitalityAmount) return;

    const amount = parseFloat(guestHospitalityAmount);

    const { error: insertError } = await supabase
      .from('guest_entries')
      .insert({
        amount: amount,
        description: 'Added to Guest Hospitality Fund'
      });

    if (insertError) {
      console.error('Error adding guest entry:', insertError);
      setError('Error adding guest entry.');
      setShowError(true);
    } else {
      setGuestHospitalityAmount('');
      setGuestHospitalityFund(prev => (prev !== null ? prev + amount : amount));
      fetchGuestEntries();
    }
  };

  const distributeNegativeBalance = async () => {
    if (guestHospitalityFund >= 0 || users.length === 0) {
      setError('The Guest Hospitality Fund is not negative or there are no assigned users.');
      setShowError(true);
      return;
    }

    const amountPerUser = Math.abs(guestHospitalityFund) / users.length;
    const description = `Guest Hospitality Fund (Deficit Coverage)`;

    const budgetEntries = users.map((user: User) => ({
      user_id: user.id,
      amount: amountPerUser,
      type: 'withdrawal' as const,
      description
    }));

    const { error: insertError } = await supabase
      .from('budget_entries')
      .insert(budgetEntries);

    if (insertError) {
      console.error('Error distributing negative balance:', insertError);
      setError('Error distributing negative balance.');
      setShowError(true);
    } else {
      // Add a deposit to the guest entries to balance it out
      await supabase
        .from('guest_entries')
        .insert({
          amount: Math.abs(guestHospitalityFund),
          type: 'deposit',
          description: 'Balanced Guest Hospitality Fund'
        });

      fetchGuestEntries();
      setGuestHospitalityFund(0); // Reset the fund to 0 after distribution
    }
  };

  const groupEntriesByMonth = (entries: BudgetEntry[]) => {
    const grouped: { [key: string]: BudgetEntry[] } = {};
    entries.forEach(entry => {
      const date = new Date(entry.created_at);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    });
    return grouped;
  };

  const formatAmount = (amount: number, type: 'deposit' | 'withdrawal') => {
    const formattedAmount = Math.abs(amount).toFixed(2);
    return type === 'deposit' ? `+${formattedAmount}` : `-${formattedAmount}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).replace(/ /g, ' ');
  };

  const groupedEntries = groupEntriesByMonth(budgetEntries);

  const currentBudget = useMemo(() => {
    return budgetEntries.reduce((total, entry) => {
      return entry.type === 'deposit' ? total + Math.abs(entry.amount) : total - Math.abs(entry.amount);
    }, 0);
  }, [budgetEntries]);

  return (
    <div className="container mx-auto p-4">
      {showError && error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setShowError(false)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
            </svg>
          </span>
        </div>
      )}
      <Card className="mb-6 max-w-2xl w-fit min-w-[400px] mx-auto">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row w-full items-start sm:items-center">
            <span>Guest Hospitality Fund</span>
            <div className="mt-2 sm:mt-0 sm:ml-auto">
              <span className={`font-bold ${guestHospitalityFund < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {guestHospitalityFund.toFixed(0)} :-
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="w-full sm:w-auto">
              <Label htmlFor="guestHospitalityAmount" className="mb-2 block">Amount</Label>
              <Input
                id="guestHospitalityAmount"
                type="number"
                value={guestHospitalityAmount}
                onChange={(e) => setGuestHospitalityAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <Button onClick={handleAddToGuestHospitalityFund} className="w-full sm:w-auto">Add to Fund</Button>
              {guestHospitalityFund < 0 && (
                <Button 
                  onClick={distributeNegativeBalance}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Distribute (-{Math.abs(guestHospitalityFund).toFixed(0)} :-)
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(groupedEntries).length === 0 ? (
        <Card className="mb-6">
          <CardContent>
            <p className="text-center text-gray-500">No budget entries found.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedEntries).map(([month, entries]) => (
          <Card key={month} className="mb-6">
            <CardHeader>
              <CardTitle>{new Date(month).toLocaleString('default', { month: 'long', year: 'numeric' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left w-24">Amount</th>
                      <th className="text-left">Description</th>
                      <th className="text-left w-24">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className={`${entry.type === 'deposit' ? 'text-green-500' : 'text-red-500'} w-24`}>
                          {formatAmount(entry.amount, entry.type)} :-
                        </td>
                        <td>{entry.description}</td>
                        <td className="w-24">{formatDate(entry.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default GuestHospitality;
