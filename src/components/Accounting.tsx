import React, { useState, useEffect, useContext, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { UserContext } from './Layout';
import SimpleUserIcon from './SimpleUserIcon';
import { UserData } from './Layout';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

interface DinnerDay {
  id: string;
  date: string;
  cooks: string[];
  attendants: Attendant[];
  used_budget: number;
  guestCount?: number;
  guestAmount?: number;
}

interface Attendant {
  id: string;
  portions: number | string;
  isTakeAway: boolean;
}

interface GuestEntry {
  id: string;
  dinner_id: string;
  guest_name: string;
}

const Accounting: React.FC = () => {
  const [dinnerDays, setDinnerDays] = useState<DinnerDay[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const users = useContext(UserContext);

  useEffect(() => {
    fetchDinnerDays();
  }, [selectedYear, selectedMonth, selectedUser]);

  const fetchDinnerDays = async () => {
    try {
      let query = supabase
        .from('dinner_days')
        .select('*')
        .not('used_budget', 'is', null)
        .order('date', { ascending: false });

      if (selectedYear && selectedYear !== 'all') {
        query = query.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`);
      }

      if (selectedMonth && selectedMonth !== 'all') {
        const startDate = `${selectedYear}-${selectedMonth}-01`;
        const endDate = `${selectedYear}-${selectedMonth}-31`;
        query = query.gte('date', startDate).lte('date', endDate);
      }

      if (selectedUser && selectedUser !== 'all') {
        query = query.contains('cooks', [selectedUser]);
      }

      const { data: dinnerData, error: dinnerError } = await query;

      if (dinnerError) {
        throw dinnerError;
      }

      setDinnerDays(dinnerData);
      setError(null);
    } catch (err) {
      console.error('Error fetching dinner days:', err);
      setError('Failed to fetch dinner days. Please try again later.');
    }
  };

  const calculatePortions = (attendants: Attendant[]) => {
    let totalPortions = 0;
    let guestCount = 0;

    attendants.forEach(attendant => {
      const portions = typeof attendant.portions === 'string' ? parseFloat(attendant.portions) : (attendant.portions || 1);
      const portionCount = isNaN(portions) ? 1 : portions;

      totalPortions += portionCount;
      if (attendant.id.startsWith('guest-')) {
        guestCount++;
      }
    });

    return { totalPortions, guestCount };
  };

  const formatPortions = (portionsInfo: { totalPortions: number, guestCount: number }) => {
    const { totalPortions, guestCount } = portionsInfo;
    const formattedPortions = Number.isInteger(totalPortions) ? totalPortions.toString() : totalPortions.toFixed(1);
    if (guestCount > 0) {
      return `${formattedPortions} portions (${guestCount} guest${guestCount > 1 ? 's' : ''})`;
    }
    return `${formattedPortions} portions`;
  };

  const groupDinnerDaysByMonth = () => {
    const grouped: { [key: string]: DinnerDay[] } = {};
    dinnerDays.forEach(day => {
      const monthYear = day.date.substring(0, 7); // YYYY-MM
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(day);
    });
    return grouped;
  };

  const groupedDinnerDays = groupDinnerDaysByMonth();

  const getYearOptions = useMemo(() => {
    const years = dinnerDays.map(day => day.date.substring(0, 4));
    return Array.from(new Set(years)).sort().reverse();
  }, [dinnerDays]);

  const getMonthOptions = useMemo(() => {
    const months = dinnerDays
      .filter(day => day.date.startsWith(selectedYear))
      .map(day => day.date.substring(5, 7));
    return Array.from(new Set(months)).sort();
  }, [dinnerDays, selectedYear]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Accounting Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {getYearOptions.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {getMonthOptions.map(month => (
                  <SelectItem key={month} value={month}>
                    {new Date(`2000-${month}-01`).toLocaleString('default', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users && users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center">
                      <SimpleUserIcon user={user} size="small" />
                      <span className="ml-2">{user.raw_user_meta_data?.display_name || user.id}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); setSelectedUser('all'); }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {dinnerDays.length === 0 ? (
        <div>No dinner days found.</div>
      ) : (
        Object.entries(groupedDinnerDays).map(([monthYear, days]) => (
          <Card key={monthYear} className="mb-6">
            <CardHeader>
              <CardTitle>
                {new Date(monthYear).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Date</th>
                      <th className="text-left">Chef</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Portions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(day => {
                      const portionsInfo = calculatePortions(day.attendants);
                      return (
                        <tr key={day.id}>
                          <td>
                            {new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td>
                            <div className="flex items-center space-x-2">
                              {day.cooks.map(cookId => {
                                const user = users && users.find(u => u.id === cookId);
                                return (
                                  <div key={cookId} className="flex items-center space-x-1">
                                    <SimpleUserIcon
                                      user={user || { id: cookId, raw_user_meta_data: {} }}
                                      size="small"
                                    />
                                    <span>{user?.raw_user_meta_data?.display_name || cookId}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="text-right">
                            {day.used_budget.toFixed(2)} :-
                          </td>
                          <td className="text-right">
                            {formatPortions(portionsInfo)}
                          </td>
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
    </div>
  );
};

export default Accounting;
