import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { createClient } from '@supabase/supabase-js';
import UserIcon from './UserIcon';
import { UserContext } from './Layout';
import Toast from './Toast';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

interface BudgetEntry {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  description: string;
  created_at: string;
  dinner_id?: string;
}

interface User {
  id: string;
  email?: string;
  type?: string;
  raw_user_meta_data?: {
    display_name?: string;
    iconColor?: string;
    [key: string]: any;
  };
}

interface BudgetProps {
  isAdmin: boolean;
}

const Budget: React.FC<BudgetProps> = ({ isAdmin }) => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>([]);
  const users = useContext(UserContext);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState<boolean>(false);
  const [guestHospitalityFund, setGuestHospitalityFund] = useState<number>(0);
  const [guestHospitalityAmount, setGuestHospitalityAmount] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchGuestHospitalityFund();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchBudgetEntries();
    }
  }, [currentUser]);

  const fetchGuestHospitalityFund = async () => {
    const { data, error } = await supabase
      .from('guest_entries')
      .select('*');

    if (error) {
      console.error('Error fetching guest hospitality fund entries:', error);
    } else {
      const fundTotal = data.reduce((total, entry) => {
        return total + entry.amount;
      }, 0);
      setGuestHospitalityFund(fundTotal);
    }
  };

  const handleAddToGuestHospitalityFund = async () => {
    if (!guestHospitalityAmount) return;

    const amount = parseFloat(guestHospitalityAmount);

    const newEntry = {
      amount: amount,
      description: 'Added to Guest Hospitality Fund'
    };

    const { error } = await supabase
      .from('guest_entries')
      .insert(newEntry);

    if (error) {
      console.error('Error adding to guest hospitality fund:', error);
      setError('Error adding to guest hospitality fund.');
      setShowError(true);
    } else {
      setGuestHospitalityAmount('');
      fetchGuestHospitalityFund();
      setNotification(`${amount} :- added to Guest Hospitality Fund`);
      setTimeout(() => setNotification(null), 3000); // Clear notification after 3 seconds
    }
  };

  useEffect(() => {
    if (currentUser) {
      setSelectedUser(currentUser.id);
    } else if (users.length > 0) {
      setSelectedUser(users[0].id);
    }
  }, [currentUser, users]);

  const fetchBudgetEntries = async () => {
    if (!currentUser) {
      console.error('No current user');
      return;
    }

    const { data, error } = await supabase
      .from('budget_entries')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching budget entries:', error);
      setError('Error fetching budget entries. Please check if the "budget_entries" table exists in your Supabase database.');
      setShowError(true);
    } else {
      setBudgetEntries(data || []);
    }
  };

  const fetchCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error fetching current user:', error);
    } else if (user) {
      setCurrentUser({
        id: user.id,
        email: user.email,
        raw_user_meta_data: user.user_metadata || {}
      });
    }
  };

  const handleAddMoney = async (amountToAdd: number | undefined = undefined, userToAdd: string | undefined = undefined, description: string | undefined = undefined) => {
    const addAmount = amountToAdd !== undefined ? amountToAdd : parseFloat(amount);
    const addUser = userToAdd || selectedUser;

    if (!addAmount || !addUser) return;

    let addDescription = description;
    if (!addDescription) {
      if (addUser === currentUser?.id) {
        addDescription = 'Money added';
      } else {
        const fromUser = users.find(u => u.id === currentUser?.id);
        addDescription = `Money added from ${fromUser?.raw_user_meta_data?.display_name || 'Unknown user'}`;
      }
    }

    const newEntry = {
      user_id: addUser,
      amount: addAmount,
      type: 'deposit' as const,
      description: addDescription,
    };

    const { error } = await supabase
      .from('budget_entries')
      .insert(newEntry);

    if (error) {
      console.error('Error adding money:', error);
      setError('Error adding money. Please check if the "budget_entries" table exists in your Supabase database.');
      setShowError(true);
    } else {
      fetchBudgetEntries();
      if (!amountToAdd) {
        setAmount('');
        setSelectedUser('');
      }
      const user = users.find(u => u.id === addUser);
      setNotification(`${addAmount} :- added to ${user?.raw_user_meta_data?.display_name || addUser}'s budget`);
      setTimeout(() => setNotification(null), 3000); // Clear notification after 3 seconds
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
      {notification && (
        <Toast message={notification} onClose={() => setNotification(null)} />
      )}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <Card className="flex-1 min-w-[300px]">
          <CardHeader>
            <CardTitle className='flex w-full'>
              Guest Hospitality Fund
              <div className="ml-auto flex items-center">
                <span className="mr-2">Fund: <span className="font-bold">{guestHospitalityFund.toFixed(0)} :-</span></span>
                {isAdmin && (
                  <Button onClick={() => navigate('/guest-hospitality')} size="sm">
                    Details
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end space-x-4 ">
              <div className="flex-1">
                <Label htmlFor="guestHospitalityAmount">Amount</Label>
                <Input
                  id="guestHospitalityAmount"
                  type="number"
                  value={guestHospitalityAmount}
                  onChange={(e) => setGuestHospitalityAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddToGuestHospitalityFund}>Add to Fund</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[300px]">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className='flex w-full'>Add Money
              <div className="ml-auto">
                Budget: <span className="font-bold">{currentBudget.toFixed(0)} :-</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="user">To User</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentUser && (
                        <SelectItem key={currentUser.id} value={currentUser.id}>
                          <div className="flex items-center">
                            <UserIcon
                              user={{
                                id: currentUser.id,
                                email: currentUser.email || '',
                                raw_user_meta_data: {
                                  display_name: currentUser.raw_user_meta_data?.display_name,
                                  iconColor: currentUser.raw_user_meta_data?.iconColor
                                }
                              }}
                              size="small"
                            />
                            <span className="ml-2">{currentUser.raw_user_meta_data?.display_name || currentUser.id} (You)</span>
                          </div>
                        </SelectItem>
                      )}
                      {users
                        .filter(user => user.id !== currentUser?.id && user.raw_user_meta_data?.display_name)
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center">
                              <UserIcon
                                user={user}
                                size="small"
                              />
                              <span className="ml-2">{user.raw_user_meta_data?.display_name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button onClick={() => handleAddMoney()} className="w-full">Add Money</Button>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

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
                    {entries.map((entry) => {
                      const user = users.find(u => u.id === entry.user_id);
                      const isCurrentUser = entry.user_id === currentUser?.id;
                      return (
                        <tr key={entry.id}>
                          <td className={`${entry.type === 'deposit' ? 'text-green-500' : 'text-red-500'} w-24`}>
                            {formatAmount(entry.amount, entry.type)} :-
                          </td>
                          <td>{entry.description}</td>
                          <td className="w-24">{formatDate(entry.created_at)}</td>
                        </tr>
                      );
                    })}
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

export default Budget;
