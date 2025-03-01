import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { X, UserRound } from 'lucide-react';
import ToDo from './ToDo';
import { calculateWashingCost } from '../utils/washingCost';
import { supabase } from '../utils/createClient';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  washing_count: number;
  drying_count: number;
  user_id: string;
  user_name: string;
}

interface Attendant {
  id: string;
  portions: number;
  isTakeAway: boolean;
}

interface DinnerDay {
  date: string;
  cooks: string[];
  ingredients: string[];
  attendants: Attendant[];
  cost?: number;
  used_budget?: number | null;
}

const Dashboard: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [upcomingDinner, setUpcomingDinner] = useState<DinnerDay | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [budgetPerMeal, setBudgetPerMeal] = useState<number>(30);
  const [currency, setCurrency] = useState<string>(':-');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [guestHospitalityFund, setGuestHospitalityFund] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
    fetchAdminSettings();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchBookings();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchNextUserDinner();
    }
  }, [currentUser]);

  useEffect(() => {
    if (upcomingDinner) {
      setSelectedIngredients(upcomingDinner.ingredients);
    }
  }, [upcomingDinner]);

  const fetchNextUserDinner = async () => {
    if (!currentUser) {
      console.log('No current user, skipping fetchNextUserDinner');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('dinner_days')
      .select('*')
      .gte('date', today.toISOString())
      .order('date');

    if (error) {
      console.error('Error fetching next user dinner:', error);
      setUpcomingDinner(null);
    } else {
      const nextDinner = data.find(dinner => {
        const dinnerDate = new Date(dinner.date);
        return dinnerDate >= today && Array.isArray(dinner.cooks) && dinner.cooks.includes(currentUser);
      });
      setUpcomingDinner(nextDinner || null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' });
    }
  };

  const fetchBookings = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sixDaysBefore = new Date(today);
    sixDaysBefore.setDate(sixDaysBefore.getDate() - 6);

    const oneDayAfter = new Date(today);
    oneDayAfter.setDate(oneDayAfter.getDate() + 1);
    oneDayAfter.setHours(23, 59, 59, 999);

    // Only fetch current user's bookings
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('washing_reservations')
      .select('*')
      .eq('user_id', currentUser)
      .gte('start_time', sixDaysBefore.toISOString())
      .lte('start_time', oneDayAfter.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
    } else {
      setBookings(data);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    // First, delete the associated budget entry
    const { error: budgetError } = await supabase
      .from('budget_entries')
      .delete()
      .match({ reservation_id: id });

    if (budgetError) {
      console.error('Error deleting budget entry:', budgetError);
      return;
    }

    // Then, delete the washing reservation
    const { error: reservationError } = await supabase
      .from('washing_reservations')
      .delete()
      .match({ id });

    if (reservationError) {
      console.error('Error deleting booking:', reservationError);
    } else {
      setBookings(prevBookings => prevBookings.filter(booking => booking.id !== id));
    }
  };

  const handleUpdateBooking = async (id: string, washingCount: number, dryingCount: number) => {
    try {
      // Calculate the new cost
      const newCost = await calculateWashingCost(washingCount, dryingCount);

      if (newCost === 0) {
        console.error('Error calculating washing cost');
        return;
      }

      const { data: reservationData, error: reservationError } = await supabase
        .from('washing_reservations')
        .update({ washing_count: washingCount, drying_count: dryingCount })
        .match({ id })
        .select();

      if (reservationError) {
        console.error('Error updating booking:', reservationError);
        return;
      }

      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.id === id ? { ...booking, washing_count: washingCount, drying_count: dryingCount } : booking
        )
      );

      // Update the corresponding budget entry
      const reservationDate = moment(reservationData[0].start_time).format('D MMM');
      let description = `Washing - ${reservationDate}: `;
      const parts = [];
      if (washingCount > 0) {
        parts.push(`${washingCount} wash`);
      }
      if (dryingCount > 0) {
        parts.push(`${dryingCount} dry`);
      }
      description += parts.join(', ');

      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_entries')
        .update({
          amount: newCost,
          description: description,
        })
        .match({ reservation_id: id });

      if (budgetError) {
        console.error('Error updating budget entry:', budgetError);
        // Consider how to handle this error
      }
    } catch (error) {
      console.error('Error in handleUpdateBooking:', error);
    }
  };

  const formatTime = (start_time: string, end_time: string) => {
    const start = new Date(start_time);
    const end = new Date(end_time);
    const dayName = start.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = start.toLocaleDateString('en-US', { month: 'short' });
    const startHour = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endHour = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${startHour} - ${endHour} ${dayName}, ${monthName} ${start.getDate()}`;
  };

  // Removed fetchTodaysDinner function as it's no longer needed

  const fetchCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error fetching current user:', error);
    } else if (user) {
      setCurrentUser(user.id);
    }
  };

  const fetchAdminSettings = async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching admin settings:', error);
    } else if (data) {
      setBudgetPerMeal(data.budget_per_meal || 30);
      setCurrency(data.currency || ':-');
    }
  };

  const calculateBudget = (attendants: Attendant[]) => {
    const totalPortions = attendants.reduce((total, attendant) => {
      if (attendant.id.startsWith('guest-')) {
        return total + 1; // Count guests as 1 portion each
      }
      return total + (Number(attendant.portions) || 0);
    }, 0);
    return totalPortions * budgetPerMeal;
  };



  const updateIngredients = useCallback(async (date: string, ingredient?: string, isChecked?: boolean, usedBudget?: number | null) => {
    if (!upcomingDinner) return;

    let newIngredients = [...upcomingDinner.ingredients];
    if (ingredient !== undefined && isChecked !== undefined) {
      newIngredients = isChecked
        ? [...newIngredients, ingredient]
        : newIngredients.filter(i => i !== ingredient);
    }

    const updateData: any = { ingredients: newIngredients };
    if (usedBudget !== undefined) {
      updateData.used_budget = usedBudget;
    }

    const { data, error } = await supabase
      .from('dinner_days')
      .update(updateData)
      .eq('date', date)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating ingredients or used budget:', error);
    } else {
      if (data) {
        setUpcomingDinner(prevDinner => ({
          ...prevDinner!,
          ...data,
          ingredients: newIngredients,
          used_budget: usedBudget !== undefined ? usedBudget : data.used_budget
        }));
      } else {
        setUpcomingDinner(prevDinner => {
          if (!prevDinner) return null;
          return {
            ...prevDinner,
            ingredients: newIngredients,
            used_budget: usedBudget !== undefined ? usedBudget : prevDinner.used_budget
          };
        });
      }
      setSelectedIngredients(newIngredients);

      if (usedBudget === null || usedBudget === 0) {
        await removeBudgetEntries(date);
      } else if (usedBudget !== undefined && usedBudget > 0) {
        await createBudgetEntries(date, usedBudget);
      }
    }
  }, [upcomingDinner]);

  const removeBudgetEntries = async (date: string) => {
    const { error } = await supabase
      .from('budget_entries')
      .delete()
      .eq('dinner_id', date);

    if (error) {
      console.error('Error removing budget entries:', error);
    }
  };

  const createBudgetEntries = async (date: string, usedBudget: number) => {
    if (!upcomingDinner) return;

    const totalPortions = upcomingDinner.attendants.reduce((total, attendant) => {
      if (attendant.id.startsWith('guest-')) {
        return total + 1; // Count guests as 1 portion each
      }
      return total + (Number(attendant.portions) || 0);
    }, 0);

    const guestCount = upcomingDinner.attendants.filter(a => a.id.startsWith('guest-')).length;
    if (guestCount > 0) {
      const guestCost = (usedBudget / totalPortions) * guestCount;
      const formattedDate = new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      const guestDescription = `Dinner ${formattedDate} (${guestCount} guest${guestCount > 1 ? 's' : ''})`;

      const { data: existingGuestEntry } = await supabase
        .from('guest_entries')
        .select('*')
        .eq('dinner_id', date)
        .single();

      if (existingGuestEntry) {
        await supabase
          .from('guest_entries')
          .update({
            amount: -guestCost,
            description: guestDescription
          })
          .eq('id', existingGuestEntry.id);
      } else {
        await supabase.from('guest_entries').insert({
          amount: -guestCost,
          type: 'withdrawal',
          description: guestDescription,
          dinner_id: date
        });
      }
    }

    // Update or create budget entries for each user
    for (const attendant of upcomingDinner.attendants) {
      if (!attendant.id.startsWith('guest-')) {
        const userPortions = Number(attendant.portions) || 0;
        const individualAmount = (usedBudget / totalPortions) * userPortions;
        const formattedDate = new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
        const userDescription = `Dinner ${formattedDate} (${userPortions} portion${userPortions > 1 ? 's' : ''})`;

        const { data: existingUserEntry } = await supabase
          .from('budget_entries')
          .select('*')
          .eq('dinner_id', date)
          .eq('user_id', attendant.id)
          .single();

        if (existingUserEntry) {
          await supabase
            .from('budget_entries')
            .update({
              amount: -individualAmount,
              description: userDescription
            })
            .eq('id', existingUserEntry.id);
        } else {
          await supabase.from('budget_entries').insert({
            user_id: attendant.id,
            amount: -individualAmount,
            type: 'withdrawal',
            description: userDescription,
            dinner_id: date
          });
        }
      }
    }
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-6">
      <div className="md:col-span-2">
        <Card className="mb-6 w-full max-w-3xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Dinner</CardTitle>
            {upcomingDinner && <span className="text-lg font-semibold">{formatDate(upcomingDinner.date)}</span>}
          </CardHeader>
          <CardContent>
            {upcomingDinner ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Ingredients:</h3>
                  <span className="text-lg font-semibold">
                    {calculateBudget(upcomingDinner.attendants || [])} {currency} / {upcomingDinner.attendants ? upcomingDinner.attendants.reduce((total, attendant) => {
                      if (attendant.id.startsWith('guest-')) {
                        return total + 1; // Count guests as 1 portion each
                      }
                      return total + (Number(attendant.portions) || 0);
                    }, 0) : 0}
                    <UserRound size={18} className="inline ml-1 mr-1" strokeWidth={2.5} />
                  </span>
                </div>
                <ToDo
                  ingredients={upcomingDinner.ingredients}
                  selectedIngredients={selectedIngredients}
                  updateIngredients={updateIngredients}
                  date={upcomingDinner.date}
                  usedBudget={upcomingDinner.used_budget || 0}
                  currency={currency}
                  totalBudget={calculateBudget(upcomingDinner.attendants || [])}
                />
              </>
            ) : (
              <p className="text-center text-gray-500">No upcoming dinners assigned to you.</p>
            )}
          </CardContent>
        </Card>
      </div>
      {bookings.length > 0 && (
        <div className="col-span-1">
          <Card className="overflow-hidden shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>
                </svg>
                Recent Washing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                    <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-primary">{booking.user_name}</h3>
                        <p className="text-sm text-gray-500">{formatTime(booking.start_time, booking.end_time)}</p>
                      </div>
                      <Button
                        onClick={() => handleDeleteBooking(booking.id)}
                        variant="outline"
                        size="icon"
                        className="rounded-full w-8 h-8 p-0 opacity-80 hover:opacity-100"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <Label htmlFor={`washing-${booking.id}`} className="mb-1 block font-medium text-blue-700">
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M8 12a4 4 0 0 1 8 0Z"/>
                              </svg>
                              Washing
                            </div>
                          </Label>
                          <Input
                            id={`washing-${booking.id}`}
                            type="number"
                            value={booking.washing_count}
                            onChange={(e) => handleUpdateBooking(booking.id, parseInt(e.target.value), booking.drying_count)}
                            min={0}
                            className="w-full border-blue-200 focus:border-blue-500"
                          />
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <Label htmlFor={`drying-${booking.id}`} className="mb-1 block font-medium text-purple-700">
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <path d="M12 2v4"/>
                                <path d="m6.8 14-3.5-2"/>
                                <path d="m20.7 12-3.5 2"/>
                                <path d="M6.8 10 3.3 12"/>
                                <path d="m20.7 12-3.5-2"/>
                                <path d="m9 22 3-8 3 8"/>
                                <path d="M8 22h8"/>
                              </svg>
                              Drying
                            </div>
                          </Label>
                          <Input
                            id={`drying-${booking.id}`}
                            type="number"
                            value={booking.drying_count}
                            onChange={(e) => handleUpdateBooking(booking.id, booking.washing_count, parseInt(e.target.value))}
                            min={0}
                            className="w-full border-purple-200 focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
