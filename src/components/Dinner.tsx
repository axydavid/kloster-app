import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import UserIcon from './UserIcon';
import UserTag from './UserTag';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { UserContext } from './Layout';
import { useNavigate } from 'react-router-dom';
import cowIcon from '../icons/cow.png';
import pigIcon from '../icons/pig.png';
import chickenIcon from '../icons/chicken.png';
import LongPressModal from './LongPressModal';
import { UserPlus } from 'lucide-react';
import fishIcon from '../icons/fish.png';
import riceBowlIcon from '../icons/rice-bowl.png';
import potatoIcon from '../icons/potato.png';
import breadIcon from '../icons/bread.png';
import saladIcon from '../icons/salad.png';
import mincedMeatIcon from '../icons/minced-meat.png';
import pastaIcon from '../icons/pasta.png';
import cheeseIcon from '../icons/cheese.png';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

const Dinner: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchCurrentUser();
  }, []);

  const ingredientIcons: { [key: string]: React.ReactElement } = {
    'Beef': <img src={cowIcon} alt="Beef" className="w-10 h-10 object-contain" />,
    'Pork': <img src={pigIcon} alt="Pork" className="w-10 h-10 object-contain" />,
    'Chicken': <img src={chickenIcon} alt="Chicken" className="w-10 h-10 object-contain" />,
    'Fish': <img src={fishIcon} alt="Fish" className="w-10 h-10 object-contain" />,
    'Minced Meat': <img src={mincedMeatIcon} alt="Minced Meat" className="w-10 h-10 object-contain" />,
    'Rice': <img src={riceBowlIcon} alt="Rice" className="w-10 h-10 object-contain" />,
    'Potatoes': <img src={potatoIcon} alt="Potatoes" className="w-10 h-10 object-contain" />,
    'Pasta': <img src={pastaIcon} alt="Pasta" className="w-10 h-10 object-contain" />,
    'Bread': <img src={breadIcon} alt="Bread" className="w-10 h-10 object-contain" />,
    'Salad': <img src={saladIcon} alt="Salad" className="w-10 h-10 object-contain" />,
    'Cheese': <img src={cheeseIcon} alt="Cheese" className="w-10 h-10 object-contain" />,
  };

  interface Attendant {
    id: string;
    portions: number;
    isTakeAway: boolean;
    isAutomaticallySet: boolean;
  }

  interface DinnerDay {
    date: string;
    cooks: string[];
    ingredients: string[];
    attendants: Attendant[];
  }

  interface AdminSettings {
    budgetPerMeal: number;
    currencyType: string;
    suspendedWeekdays: number[];
    dinner: string[];
  }

  interface UserData {
    id: string;
    raw_user_meta_data: any;
  }
  const hasScrolledToCurrentDay = useRef(false);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    budgetPerMeal: 0,
    currencyType: ':-',
    suspendedWeekdays: [],
    dinner: []
  });
  const navigate = useNavigate();

  const canMakeChanges = useCallback(() => {
    return currentUserId ? adminSettings.dinner.includes(currentUserId) : false;
  }, [adminSettings.dinner, currentUserId]);

  const showRestrictedAccessPopup = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      const dialog = document.createElement('div');
      dialog.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in ease-out duration-300" onclick="this.classList.add('animate-out', 'fade-out'); setTimeout(() => { this.remove(); resolve(false); }, 250);">
          <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full animate-in zoom-in-50 duration-300" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold">Restricted Access</h2>
              <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').classList.add('animate-out', 'fade-out'); setTimeout(() => { this.closest('.fixed').remove(); resolve(false); }, 250);">✕</button>
            </div>
            <p class="mb-4">You cannot make changes as you have not joined dinners in settings.</p>
            <div class="flex justify-end space-x-2">
              <button class="px-4 py-2 bg-gray-200 rounded" onclick="this.closest('.fixed').classList.add('animate-out', 'fade-out'); setTimeout(() => { this.closest('.fixed').remove(); resolve(false); }, 250);">OK</button>
              <button class="px-4 py-2 bg-blue-500 text-white rounded" onclick="this.closest('.fixed').classList.add('animate-out', 'fade-out'); setTimeout(() => { this.closest('.fixed').remove(); resolve(true); }, 250);">Settings</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);
      (window as any).resolve = resolve;

      const handleEscapeKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          dialog.querySelector('.fixed')?.classList.add('animate-out', 'fade-out');
          setTimeout(() => {
            dialog.remove();
            resolve(false);
          }, 250);
          document.removeEventListener('keydown', handleEscapeKey);
        }
      };
      document.addEventListener('keydown', handleEscapeKey);
    });
  }, []);

  const handleRestrictedAccess = useCallback(async () => {
    if (!canMakeChanges()) {
      const goToSettings = await showRestrictedAccessPopup();
      if (goToSettings) {
        navigate('/settings');
      }
      return false;
    }
    return true;
  }, [canMakeChanges, showRestrictedAccessPopup, navigate]);
  const users = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminSettings = async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('budget_per_meal, currency_type, suspended_weekdays, dinner');

    if (error) {
      console.error('Error fetching admin settings:', error);
    } else if (data && data.length > 0) {
      const adminData = data[0];
      setAdminSettings({
        budgetPerMeal: adminData.budget_per_meal,
        currencyType: adminData.currency_type,
        suspendedWeekdays: adminData.suspended_weekdays || [],
        dinner: adminData.dinner || []
      });
    } else {
      console.error('No admin settings found');
    }
  };

  useEffect(() => {
    fetchAdminSettings();
  }, []);
  const fixedHeaderStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  };
  const contextUsers = useContext(UserContext);
  const [dinnerDays, setDinnerDays] = useState<DinnerDay[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>(() => new Date());
  const tableHeaderRef = useRef<HTMLDivElement>(null);
  const [isIngredientsPopupOpen, setIsIngredientsPopupOpen] = useState(false);
  const [longPressedDay, setLongPressedDay] = useState<DinnerDay | null>(null);
  const [isLongPressModalOpen, setIsLongPressModalOpen] = useState(false);
  const [userPortions, setUserPortions] = useState(1);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (currentUserId) {
      supabase.rpc('get_user_metadata', { user_id: currentUserId })
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching user metadata:', error);
          } else {
            setUserPortions(data?.portions || 1);
          }
        });
    }
  }, [currentUserId]);

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setIsIngredientsPopupOpen(open);
  }, []);

  const handleLongPress = useCallback((day: DinnerDay) => {
    setLongPressedDay(day);
    setIsLongPressModalOpen(true);
  }, []);

  const closePopover = useCallback(() => {
    const popoverTrigger = document.querySelector('[data-state="open"]');
    if (popoverTrigger instanceof HTMLElement) {
      popoverTrigger.click();
    }
  }, []);

  useEffect(() => {
    fetchDinnerDays();
  }, [startDate]);

  useEffect(() => {
    const handleScroll = () => {
      if (tableHeaderRef.current) {
        const cardContent = tableHeaderRef.current.closest('.card-content');
        const cardContentTop = cardContent ? cardContent.getBoundingClientRect().top : 0;
        if (window.scrollY > cardContentTop) {
          tableHeaderRef.current.classList.add('fixed', 'top-0', 'z-10', 'border-x');
          if (isMobile) {
            tableHeaderRef.current.classList.add('left-0');
            tableHeaderRef.current.classList.remove('left-4');
            tableHeaderRef.current.style.width = '100%';
          } else {
            tableHeaderRef.current.classList.add('left-4');
            tableHeaderRef.current.classList.remove('left-0');
            tableHeaderRef.current.style.width = 'calc(100% - 2rem)';
          }
        } else {
          tableHeaderRef.current.classList.remove('fixed', 'top-0', 'left-0', 'left-4', 'z-10', 'border-x');
          tableHeaderRef.current.style.width = '100%';
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Call once to set initial state
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  useEffect(() => {
    if (!hasScrolledToCurrentDay.current && dinnerDays.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const currentDayElement = document.getElementById(`day-${today}`);
      if (currentDayElement) {
        currentDayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      hasScrolledToCurrentDay.current = true;
    }
  }, [dinnerDays]);

  const fetchDinnerDays = async () => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 28); // 4 weeks from start date

    const { data, error } = await supabase
      .from('dinner_days')
      .select('*')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching dinner days:', error);
    } else {
      const allDays = getAllDaysInRange(startDate, endDate);
      const mergedDays = allDays.map(day => {
        const dateString = day.toISOString().split('T')[0];
        const existingDay = data?.find(d => d.date === dateString);
        return existingDay || {
          date: dateString,
          cooks: [],
          ingredients: [],
          attendants: []
        };
      });
      setDinnerDays(mergedDays);
    }
  };

  const getAllDaysInRange = (start: Date, end: Date) => {
    const days = [];
    let currentDay = new Date(start);
    while (currentDay <= end) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return days;
  };

  const isDaySuspended = (date: Date): boolean => {
    return adminSettings.suspendedWeekdays.includes(date.getDay());
  };

  const showConfirmationDialog = async (message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const dialog = document.createElement('div');
      dialog.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in ease-out duration-300" onclick="this.classList.add('animate-out', 'fade-out'); setTimeout(() => { this.remove(); resolve(false); }, 250);">
          <div class="bg-white p-6 rounded-lg shadow-xl animate-in zoom-in-50 duration-300" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold">Confirmation</h2>
              <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').classList.add('animate-out', 'fade-out'); setTimeout(() => { this.closest('.fixed').remove(); resolve(false); }, 250);">✕</button>
            </div>
            <p class="mb-4">${message.split('. ').join('.<br>')}</p>
            <div class="flex justify-end space-x-2">
              <button class="px-4 py-2 bg-blue-500 text-white rounded" onclick="this.closest('.fixed').classList.add('animate-out', 'fade-out'); setTimeout(() => { this.closest('.fixed').remove(); resolve(true); }, 250);">Continue</button>
              <button class="px-4 py-2 bg-gray-200 rounded" onclick="this.closest('.fixed').classList.add('animate-out', 'fade-out'); setTimeout(() => { this.closest('.fixed').remove(); resolve(false); }, 250);">Cancel</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);
      (window as any).resolve = resolve;

      const handleEscapeKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          dialog.querySelector('.fixed')?.classList.add('animate-out', 'fade-out');
          setTimeout(() => {
            dialog.remove();
            resolve(false);
          }, 250);
          document.removeEventListener('keydown', handleEscapeKey);
        }
      };
      document.addEventListener('keydown', handleEscapeKey);
    });
  };

  const toggleCook = async (date: string) => {
    try {
      if (!currentUserId) throw new Error('No authenticated user');
      if (!(await handleRestrictedAccess())) return;

      const day = dinnerDays.find(d => d.date === date);
      if (!day) throw new Error('Day not found');

      const isSuspendedDay = adminSettings.suspendedWeekdays.includes(new Date(date).getDay());
      const hasNoAttendeesOrCooks = (day.attendants?.length === 0 || !day.attendants) && (day.cooks?.length === 0 || !day.cooks);

      if (isSuspendedDay && hasNoAttendeesOrCooks) {
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        const confirmed = await showConfirmationDialog(`There is no cooking scheduled for ${dayName}. Are you sure you want to continue?`);
        if (!confirmed) {
          return;
        }
      }

      let updateData: { cooks: string[]; ingredients?: string[]; attendants: Attendant[] } = {
        cooks: [...(day.cooks || [])],
        attendants: [...(day.attendants || [])]
      };

      if (updateData.cooks.includes(currentUserId)) {
        // If the current user is a cook, remove them
        updateData.cooks = updateData.cooks.filter(id => id !== currentUserId);

        // Check if there are no other cooks
        if (updateData.cooks.length === 0) {
          // If there are no other cooks, also remove the ingredients
          updateData.ingredients = [];
        }
      } else {
        // If the current user is not a cook, add them
        updateData.cooks.push(currentUserId);
        // Also add them as an attendant if they're not already
        if (!updateData.attendants.some(a => a.id === currentUserId)) {
          // Fetch user metadata to get the correct portion count
          const { data: userData, error: userDataError } = await supabase.rpc('get_user_metadata', { user_id: currentUserId });
          if (userDataError) throw userDataError;
          const userPortions = userData?.portions || 1;
          updateData.attendants.push({ id: currentUserId, portions: userPortions, isTakeAway: false, isAutomaticallySet: false });
        }
      }

      const { error } = await supabase
        .from('dinner_days')
        .upsert({
          date: date,
          ...updateData
        });

      if (error) throw error;

      setDinnerDays(prevDays =>
        prevDays.map(d =>
          d.date === date ? { ...d, ...updateData } : d
        )
      );

      // Fetch the updated data to ensure we have the latest state
      await fetchDinnerDays();
    } catch (error) {
      console.error('Error toggling cook:', error);
      // You might want to show an error message to the user here
    }
  };

  const updateIngredients = async (date: string, ingredient?: string, isChecked?: boolean) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');
      if (!(await handleRestrictedAccess())) return;

      const currentUserId = user.id;

      const day = dinnerDays.find(d => d.date === date);
      if (!day) return;

      const isSuspendedDay = adminSettings.suspendedWeekdays.includes(new Date(date).getDay());
      const hasNoAttendeesOrCooks = (day.attendants?.length === 0 || !day.attendants) && (day.cooks?.length === 0 || !day.cooks);

      if (isSuspendedDay && hasNoAttendeesOrCooks) {
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        const confirmed = await showConfirmationDialog(`There is no cooking scheduled for ${dayName}. Are you sure you want to continue?`);
        if (!confirmed) {
          return;
        }
      }

      let newIngredients = Array.isArray(day.ingredients) ? [...day.ingredients] : [];
      if (!day.ingredients) {
        day.ingredients = [];
      }
      if (ingredient !== undefined && isChecked !== undefined) {
        newIngredients = isChecked
          ? [...newIngredients, ingredient]
          : newIngredients.filter(i => i !== ingredient);
      }

      let updateData: { date: string; ingredients: string[]; cooks: string[]; attendants: Attendant[] } = {
        date: date,
        ingredients: newIngredients,
        cooks: [...(day.cooks || [])],
        attendants: [...(day.attendants || [])]
      };

      // Only add the cook if it's not already there and there are ingredients
      if (newIngredients.length > 0 && !updateData.cooks.includes(currentUserId)) {
        updateData.cooks.push(currentUserId);
        // Also add them as an attendant if they're not already
        if (!updateData.attendants.some(a => a.id === currentUserId)) {
          // Fetch user metadata to get the correct portion count
          const { data: userData, error: userDataError } = await supabase.rpc('get_user_metadata', { user_id: currentUserId });
          if (userDataError) throw userDataError;
          const userPortions = userData?.portions || 1;
          updateData.attendants.push({ id: currentUserId, portions: userPortions, isTakeAway: false, isAutomaticallySet: false });
        }
      }

      const { error } = await supabase
        .from('dinner_days')
        .upsert(updateData);

      if (error) {
        throw error;
      }

      setDinnerDays(prevDays =>
        prevDays.map(d =>
          d.date === date ? { ...d, ...updateData } : d
        )
      );

      // Fetch the updated data to ensure we have the latest state
      fetchDinnerDays();
    } catch (error) {
      console.error('Error updating ingredients:', error);
      // You might want to show an error message to the user here
    }
  };

  const toggleAttendance = async (date: string, isTakeAway: boolean = false, portions: number = userPortions) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');
      if (!(await handleRestrictedAccess())) return;

      const currentUserId = user.id;

      // Fetch the existing day
      const { data: existingDay, error: fetchError } = await supabase
        .from('dinner_days')
        .select('attendants, cooks, ingredients')
        .eq('date', date)
        .single();

      let attendants: Attendant[] = existingDay?.attendants || [];
      let cooks: string[] = existingDay?.cooks || [];
      let ingredients: string[] = existingDay?.ingredients || [];

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const isSuspendedDay = adminSettings.suspendedWeekdays.includes(new Date(date).getDay());
      const hasNoAttendeesOrCooks = attendants.length === 0 && cooks.length === 0;

      if (isSuspendedDay && hasNoAttendeesOrCooks) {
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        const confirmed = await showConfirmationDialog(`There is no cooking scheduled for ${dayName}. Are you sure you want to continue?`);
        if (!confirmed) {
          return;
        }
      }

      const existingAttendantIndex = attendants.findIndex(a => a.id === currentUserId);

      if (existingAttendantIndex !== -1) {
        // Remove existing attendance
        attendants.splice(existingAttendantIndex, 1);
      } else {
        // Add new attendance
        attendants.push({
          id: currentUserId,
          portions,
          isTakeAway,
          isAutomaticallySet: false
        } as Attendant);
      }

      const { error: upsertError } = await supabase
        .from('dinner_days')
        .upsert({ date, attendants, cooks, ingredients });

      if (upsertError) throw upsertError;

      // Update the local state immediately
      setDinnerDays(prevDays =>
        prevDays.map(d =>
          d.date === date ? { ...d, attendants, cooks, ingredients } : d
        )
      );

      // Fetch the updated data to ensure we have the latest state
      await fetchDinnerDays();
    } catch (error) {
      console.error('Error updating attendance:', error);
      // You might want to show an error message to the user here
    }
  };

  const updateGuestAttendance = async (date: string, guestCount: number) => {
    try {
      // First, try to fetch the existing day
      const { data: existingDay, error: fetchError } = await supabase
        .from('dinner_days')
        .select('attendants, cooks, ingredients')
        .eq('date', date)
        .single();

      let attendants: Attendant[] = [];
      let cooks: string[] = [];
      let ingredients: string[] = [];

      if (fetchError && fetchError.code === 'PGRST116') {
        // Day doesn't exist, we'll create a new one
        console.log('Creating new dinner day for guest attendance');
      } else if (fetchError) {
        throw fetchError;
      } else {
        // Day exists, use its data
        attendants = existingDay.attendants || [];
        cooks = existingDay.cooks || [];
        ingredients = existingDay.ingredients || [];
      }

      // Remove existing guests
      const nonGuestAttendants = attendants.filter(a => !a.id.startsWith('guest-'));

      // Add new guests
      const newGuests = Array.from({ length: guestCount }, (_, i) => ({
        id: `guest-${i + 1}`,
        portions: 1,
        isTakeAway: false
      }));

      const updatedAttendants = [...nonGuestAttendants, ...newGuests];

      const { error: upsertError } = await supabase
        .from('dinner_days')
        .upsert({ date, attendants: updatedAttendants, cooks, ingredients });

      if (upsertError) throw upsertError;

      // Update the local state immediately
      setDinnerDays(prevDays =>
        prevDays.map(d =>
          d.date === date ? { ...d, attendants: updatedAttendants as Attendant[], cooks, ingredients } : d
        )
      );

      // Fetch the updated data to ensure we have the latest state
      await fetchDinnerDays();
    } catch (error) {
      console.error('Error updating guest attendance:', error);
      // You might want to show an error message to the user here
    }
  };

  const changeWeek = (increment: number) => {
    setStartDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + (increment * 28)); // 4 weeks * 7 days
      return newDate;
    });
  };

  return (
    <>
      <Card className="overflow-x-auto">
        <CardHeader className="card-header">
          <div className="flex justify-between items-center">
            <CardTitle>Dinner</CardTitle>
            <div className="flex items-center space-x-2">
              <Button onClick={() => changeWeek(-1)}>&lt;</Button>
              <div className="text-lg font-semibold">
                {startDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} - {
                  new Date(startDate.getTime() + 27 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
                }
              </div>
              <Button onClick={() => changeWeek(1)}>&gt;</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 card-content">
          <div className="flex flex-col">
            <div ref={tableHeaderRef} className="flex bg-gray-100 font-bold border-t border-gray-300" style={fixedHeaderStyle}>
              <div className="flex-[0_0_60px] md:flex-[0_0_80px] p-2 border-b border-r border-gray-300">Day</div>
              <div className="flex-[0_0_100px] md:flex-[0_0_130px] p-2 border-b border-r border-gray-300">Chef</div>
              <div className="hidden md:block flex-1 p-2 border-b border-r border-gray-300">Ingredients</div>
              <div className="flex-1 p-2 border-b border-gray-300">Attendants</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {dinnerDays.map((day, index) => (
                <div
                  key={`${day.date}-${index}`}
                  id={`day-${day.date}`}
                  style={{
                    backgroundColor: isDaySuspended(new Date(day.date))
                      ? 'rgba(229, 231, 235, 0.7)' // Lighter gray with transparency
                      : 'transparent',
                    minHeight: day.attendants.filter(a => !a.id.startsWith('guest-')).length >
                      Math.ceil(day.attendants.filter(a => !a.id.startsWith('guest-')).length / 2) ? '100px' : '80px'
                  }}
                  className={`flex border-b border-gray-300 ${new Date(day.date).toDateString() === new Date().toDateString()
                    ? 'current-day-overlay'
                    : ''
                    }`}
                >
                  <div className="flex-[0_0_60px] md:flex-[0_0_80px] p-2 border-r border-gray-300 flex flex-col justify-center">
                    <div className="text-lg">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(day.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                  <div
                    className="flex-[0_0_100px] md:flex-[0_0_130px] p-2 border-r border-gray-300 cursor-pointer"
                    onClick={(e) => {
                      // Only trigger if not clicking on a button within UserTag
                      const target = e.target as HTMLElement;
                      if (target.tagName !== 'BUTTON' && !target.closest('button')) {
                        toggleCook(day.date);
                      }
                    }}
                  >
                    {day.cooks && day.cooks.length > 0 ? (
                      <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
                        {day.cooks.map((cookId) => (
                          <UserTag
                            key={cookId}
                            user={users.find(user => user.id === cookId) || { id: cookId, raw_user_meta_data: {} }}
                            portions={1} // Default value
                            isTakeAway={false} // Default value
                            showRemoveButton={cookId === currentUserId}
                            onRemove={() => toggleCook(day.date)}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-base text-gray-400 w-full h-full flex items-center justify-center">Cook</span>
                    )}
                  </div>
                  <div className="hidden md:block flex-1 p-2 border-r border-gray-300 relative group">
                    <Popover onOpenChange={handlePopoverOpenChange}>
                      <PopoverTrigger asChild>
                        <div className="cursor-pointer h-full w-full flex items-center" onClick={(e) => {
                          e.stopPropagation();
                          updateIngredients(day.date);
                        }}>
                          <div className="flex flex-wrap items-center gap-1 md:gap-2">
                            {(day.ingredients || []).length > 0 ? (
                              (day.ingredients || []).map((ingredient, index) => (
                                <span key={index} className="inline-flex items-center">
                                  {React.cloneElement(ingredientIcons[ingredient] || <span>{ingredient}</span>, {
                                    className: 'w-7 h-auto md:w-12 md:h-auto'
                                  })}
                                </span>
                              ))
                            ) : (
                              <span className="text-base text-gray-400">None</span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full w-8 h-8 p-0 bg-green-500 hover:bg-green-600 text-white"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </Button>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[100vw] md:w-96 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="relative z-50 bg-white rounded-lg">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold leading-none">Ingredients</h4>
                            <button
                              onClick={closePopover}
                              className="text-gray-500 hover:text-gray-700 font-bold text-xl"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[
                              ['Beef', 'Pork', 'Chicken', 'Fish', 'Minced Meat'],
                              ['Rice', 'Potatoes', 'Pasta', 'Bread'],
                              ['Salad', 'Cheese']
                            ].map((column, columnIndex) => (
                              <div key={columnIndex} className="space-y-2">
                                {column.map((ingredientName) => (
                                  <div
                                    key={ingredientName}
                                    className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors duration-200 ${day.ingredients.includes(ingredientName)
                                      ? 'bg-blue-100 hover:bg-blue-200'
                                      : 'hover:bg-gray-100'
                                      }`}
                                    onClick={() => {
                                      updateIngredients(day.date, ingredientName, !day.ingredients.includes(ingredientName));
                                    }}
                                  >
                                    <span className="w-10 h-10 flex items-center justify-center">
                                      {ingredientIcons[ingredientName]}
                                    </span>
                                    <span>{ingredientName}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div
                    className="flex-1 p-2 relative cursor-pointer"
                    onMouseDown={(e) => {
                      if (isIngredientsPopupOpen) {
                        return;
                      }
                      const startTime = new Date().getTime();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const timer = setTimeout(() => {
                        handleLongPress(day);
                        setLongPressedDay(day);
                        setIsLongPressModalOpen(true);
                      }, 500);
                      const clearTimer = () => {
                        clearTimeout(timer);
                        document.removeEventListener('mouseup', handleMouseUp);
                        document.removeEventListener('mousemove', handleMouseMove);
                      };
                      const handleMouseUp = () => {
                        clearTimer();
                        const endTime = new Date().getTime();
                        if (endTime - startTime < 500) {
                          const currentAttendant = day.attendants.find(a => a.id === currentUserId);
                          toggleAttendance(day.date, currentAttendant?.isTakeAway || false, userPortions);
                        }
                      };
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const moveThreshold = 10; // pixels
                        const deltaX = Math.abs(moveEvent.clientX - startX);
                        const deltaY = Math.abs(moveEvent.clientY - startY);
                        if (deltaX > moveThreshold || deltaY > moveThreshold) {
                          clearTimer();
                        }
                      };
                      document.addEventListener('mouseup', handleMouseUp);
                      document.addEventListener('mousemove', handleMouseMove);
                      e.currentTarget.addEventListener('mouseleave', clearTimer, { once: true });
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!isIngredientsPopupOpen) {
                        handleLongPress(day);
                        setLongPressedDay(day);
                        setIsLongPressModalOpen(true);
                      }
                    }}
                    onTouchStart={(e) => {
                      const timer = setTimeout(() => {
                        handleLongPress(day);
                        setLongPressedDay(day);
                        setIsLongPressModalOpen(true);
                      }, 500);
                      const clearTimer = () => clearTimeout(timer);
                      e.currentTarget.addEventListener('touchend', clearTimer, { once: true });
                      e.currentTarget.addEventListener('touchmove', clearTimer, { once: true });
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-between">
                      {day.attendants.length > 0 ? (
                        <div className="flex items-center w-full h-full pr-10">
                          <span className="mr-2 px-2 py-1 text-sm font-bold bg-gray-100 rounded">
                            {day.attendants.reduce((total, attendant) => {
                              if (attendant.id.startsWith('guest-')) {
                                return total + 1; // Count guests as 1 portion each
                              }
                              return total + (Number(attendant.portions) || 0);
                            }, 0)}
                          </span>
                          <div className="flex flex-wrap items-center gap-1 flex-grow">
                            {day.attendants
                              .filter(attendant => !attendant.id.startsWith('guest-'))
                              .map((attendant) => (
                                <UserTag
                                  key={attendant.id}
                                  user={users.find(user => user.id === attendant.id) || {
                                    id: attendant.id,
                                    raw_user_meta_data: {}
                                  }}
                                  portions={attendant.portions}
                                  isTakeAway={attendant.isTakeAway}
                                  showRemoveButton={attendant.id === currentUserId}
                                  onRemove={() => toggleAttendance(day.date, attendant.isTakeAway)}
                                />
                              ))}
                            {/* Display guest count if there are any */}
                            {day.attendants.some(a => a.id.startsWith('guest-')) && (
                              <div
                                className="px-3 py-1 rounded-full text-sm font-bold text-gray-500 flex items-center
 gap-1 border border-gray-300 bg-white"
                              >
                                <span>Guest{day.attendants.filter(a => a.id.startsWith('guest-')).length > 1 ? `s
 (${day.attendants.filter(a => a.id.startsWith('guest-')).length})` : ''}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-base text-gray-400 w-full h-full flex items-center">None</span>
                      )}
                      {/* Guest button removed */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <div className="flex justify-center mt-4 mb-4 space-x-4">
          <Button onClick={() => changeWeek(-1)}>Previous 4 Weeks</Button>
          <Button onClick={() => changeWeek(1)}>Next 4 Weeks</Button>
        </div>
      </Card>
      <LongPressModal
        isOpen={isLongPressModalOpen}
        onClose={() => setIsLongPressModalOpen(false)}
        onJoin={(portions: number) => {
          if (longPressedDay) {
            toggleAttendance(longPressedDay.date, false, portions);
            setIsLongPressModalOpen(false);
          }
        }}
        onTakeAway={(portions: number) => {
          if (longPressedDay) {
            toggleAttendance(longPressedDay.date, true, portions);
            setIsLongPressModalOpen(false);
          }
        }}
        onAddGuests={(guestCount: number) => {
          if (longPressedDay) {
            updateGuestAttendance(longPressedDay.date, guestCount);
          }
        }}
        initialGuestCount={longPressedDay ? longPressedDay.attendants.filter(a => a.id.startsWith('guest-')).length : 0}
      />
    </>
  );
};

export default Dinner;
