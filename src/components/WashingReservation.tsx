import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"
import { Calendar, Views, EventProps } from 'react-big-calendar';
import { addWeeks, endOfWeek, format, isSameWeek, startOfWeek, subWeeks } from 'date-fns';
import { enGB } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './WashingReservation.css';
import './Dinner.css';
import { X, CalendarIcon, Clock } from 'lucide-react';
import { calculateWashingCost } from '../utils/washingCost';
import { supabase } from '../utils/createClient';
import { calendarLocalizer } from '../utils/calendarLocalizer';
import { clampWashingRange, contrastTextColor, getWashingConfirmSlotStart, mergeAdjacentWashingEvents, WashingCalendarEvent } from '../utils/washingEvents';
import { UserContext } from './Layout';

// Function to check if a time slot is during church hours
const isChurchTime = (date: Date, churchDay: number, churchStartHour: number, churchEndHour: number): boolean => {
  return date.getDay() === churchDay && date.getHours() >= churchStartHour && date.getHours() < churchEndHour;
};

const showConfirmationDialog = async (message: string): Promise<void> => {
  return new Promise<void>((resolve) => {
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in ease-out duration-300" onclick="this.classList.add('animate-out', 'fade-out'); setTimeout(() => { this.remove(); resolve(); }, 250);">
        <div class="bg-white p-6 rounded-lg shadow-xl animate-in zoom-in-50 duration-300" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Confirmation</h2>
            <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').classList.add('animate-out', 'fade-out'); setTimeout(() => { this.closest('.fixed').remove(); resolve(); }, 250);">✕</button>
          </div>
          <p class="mb-4">${message.split('. ').join('.<br>')}</p>
          <div class="flex justify-end space-x-2">
            <button class="px-4 py-2 bg-blue-500 text-white rounded" onclick="this.closest('.fixed').classList.add('animate-out', 'fade-out'); setTimeout(() => { this.closest('.fixed').remove(); resolve(); }, 250);">OK</button>
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
          resolve();
        }, 250);
        document.removeEventListener('keydown', handleEscapeKey);
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
  });
};

// Function to fetch admin settings from the database
const fetchAdminSettings = async () => {
  const { data, error } = await supabase.from('admin_settings').select('*').single();
  if (error) {
    console.error('Error fetching admin settings:', error);
    return {
      washing_start_hour: 8,
      washing_end_hour: 22,
      church_start_hour: 11,
      church_end_hour: 18
    }; // Default values
  }
  return data;
};

const formatTimeSlot = (date: Date) => format(date, 'HH:mm');
const weekOptions = { weekStartsOn: 1 as const, locale: enGB };

// Custom component for time slot cell
interface TimeSlotWrapperProps {
  value: Date;
  resource?: any;
  children: React.ReactElement;
}

const TimeSlotWrapper = ({ children, value }: TimeSlotWrapperProps) => {
  const now = new Date();
  const isCurrentHour =
    value.getDate() === now.getDate() &&
    value.getMonth() === now.getMonth() &&
    value.getFullYear() === now.getFullYear() &&
    value.getHours() === now.getHours();

  if (isCurrentHour) {
    const child = children as React.ReactElement<{ style?: React.CSSProperties }>;
    return React.cloneElement(child, {
      style: {
        ...child.props.style,
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
      },
    });
  }

  return children;
};

type CalendarEvent = WashingCalendarEvent;

const WashingReservation: React.FC = () => {
  const users = useContext(UserContext);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [washingCount, setWashingCount] = useState<number>(1);
  const [dryingCount, setDryingCount] = useState<number>(0);
  const [hours, setHours] = useState<number | ''>(1);
  const [washingEvents, setWashingEvents] = useState<CalendarEvent[]>([]);
  const [washingStartHour, setWashingStartHour] = useState(8);
  const [washingEndHour, setWashingEndHour] = useState(22);
  const [churchDay, setChurchDay] = useState(6); // Default to Saturday (6)
  const [churchStartHour, setChurchStartHour] = useState(11);
  const [churchEndHour, setChurchEndHour] = useState(18);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [selectedEndSlot, setSelectedEndSlot] = useState<Date | null>(null);
  const [hasWorkSchedule, setHasWorkSchedule] = useState(() => {
    const saved = localStorage.getItem('hasWorkSchedule');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [workStartTime, setWorkStartTime] = useState(() => {
    const saved = localStorage.getItem('workStartTime');
    return saved !== null ? saved : '08';
  });
  const [workEndTime, setWorkEndTime] = useState(() => {
    const saved = localStorage.getItem('workEndTime');
    return saved !== null ? saved : '17';
  });
  const [avoidChurchTime, setAvoidChurchTime] = useState(true);
  const [reservationOptions, setReservationOptions] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(0);
  const displayedEvents = useMemo(() => mergeAdjacentWashingEvents(washingEvents), [washingEvents]);
  const getUserColor = (userId: string) =>
    users.find(entry => entry.id === userId)?.raw_user_meta_data?.iconColor
    || users.find(entry => entry.id === userId)?.raw_user_meta_data?.icon_color
    || '#2563eb';

  useEffect(() => {
    localStorage.setItem('hasWorkSchedule', JSON.stringify(hasWorkSchedule));
  }, [hasWorkSchedule]);

  useEffect(() => {
    localStorage.setItem('workStartTime', workStartTime);
  }, [workStartTime]);

  useEffect(() => {
    localStorage.setItem('workEndTime', workEndTime);
  }, [workEndTime]);

  useEffect(() => {
    if (isDialogOpen) {
      generateReservationOptions();
    }
  }, [hasWorkSchedule, workStartTime, workEndTime, avoidChurchTime, isDialogOpen, hours]);

  const handlePreviousWeek = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const handleNextWeek = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  useEffect(() => {
    const fetchUserAndReservations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setDisplayName(user.user_metadata.display_name || user.email || 'Unknown User');
      }
      const { data, error } = await supabase
        .from('washing_reservations')
        .select('*')
        .gte('start_time', startOfWeek(currentDate, weekOptions).toISOString())
        .lte('end_time', endOfWeek(currentDate, weekOptions).toISOString());

      if (error) {
        console.error('Error fetching reservations:', error);
      } else {
        const events: CalendarEvent[] = data.map((reservation: any) => {
          const startTime = new Date(reservation.start_time);
          const endTime = new Date(reservation.end_time);
          return {
            id: reservation.id,
            title: reservation.user_name || 'Unknown User',
            start: startTime,
            end: endTime,
            allDay: false,
            user_id: reservation.user_id,
          };
        });
        setWashingEvents(events);
      }

      // Fetch admin settings
      const adminSettings = await fetchAdminSettings();
      setWashingStartHour(adminSettings.washing_start_hour);
      setWashingEndHour(adminSettings.washing_end_hour);
      setChurchDay(adminSettings.church_day ?? 6); // Default to Saturday (6) if not set
      setChurchStartHour(adminSettings.church_start_hour);
      setChurchEndHour(adminSettings.church_end_hour);
    };

    fetchUserAndReservations();

    // Set up an interval to fetch reservations every 5 minutes
    const intervalId = setInterval(fetchUserAndReservations, 5 * 60 * 1000);

    // Cleanup function to clear the interval
    return () => {
      clearInterval(intervalId);
    };
  }, [currentDate]);

  const handleSlotSelect = useCallback((slotInfo: { start: Date; end: Date; action: string; bounds?: { x: number; y: number; top: number; bottom: number; left: number; right: number } }) => {
    // Ignore selections that start in the time gutter (left side of the calendar)
    if (slotInfo.bounds && slotInfo.bounds.left <= 50) {
      return;
    }

    const now = new Date();
    if (slotInfo.start < now) {
        showConfirmationDialog("You cannot book a time slot in the past. Please select a future time slot.");
        return;
      }

      // Check if the clicked slot is within the currently selected time range
      const isWithinCurrentSelection = selectedSlot && selectedEndSlot && 
        slotInfo.start >= selectedSlot && slotInfo.start < selectedEndSlot;

      // If it's a click within the current selection, don't deselect
      if (slotInfo.action === 'click' && isWithinCurrentSelection) {
        return;
      }

      // For clicks outside the current selection or for drag selections, proceed with selection logic
      if (slotInfo.action === 'select' || slotInfo.action === 'click') {
        // If it's a click outside the current selection, deselect
        if (slotInfo.action === 'click' && !isWithinCurrentSelection && selectedSlot && selectedEndSlot) {
          setSelectedSlot(null);
          setSelectedEndSlot(null);
          return;
        }

        const { start, end } = clampWashingRange(slotInfo.start, slotInfo.end, washingStartHour, washingEndHour);
        if (end <= start) {
          return;
        }

        // Check if the selected time slot overlaps with any existing events or church time
        const isOverlapping = washingEvents.some(event =>
          (start < event.end && end > event.start)
        );
        const isChurchTimeSlot = avoidChurchTime && (isChurchTime(start, churchDay, churchStartHour, churchEndHour) || isChurchTime(new Date(end.getTime() - 1), churchDay, churchStartHour, churchEndHour));
        const isWorkTimeSlot = hasWorkSchedule && start.getDay() >= 1 && start.getDay() <= 5 &&
          (start.getHours() >= parseInt(workStartTime) && start.getHours() < parseInt(workEndTime));

        if (!isOverlapping && !isChurchTimeSlot && !isWorkTimeSlot) {
          setSelectedSlot(start);
          setSelectedEndSlot(end);
        } else if (isChurchTimeSlot) {
          const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][churchDay];
          showConfirmationDialog(`This time slot is during church hours (${dayName} ${churchStartHour}:00-${churchEndHour}:00). Please select another time or disable church time.`);
        } else if (isWorkTimeSlot) {
          showConfirmationDialog("This time slot is during your work hours. Please select another time or change your work schedule.");
        } else {
          showConfirmationDialog("This time slot is already booked. Please select another time.");
        }
      }
  }, [avoidChurchTime, churchStartHour, churchEndHour, hasWorkSchedule, workStartTime, workEndTime, washingEvents, selectedSlot, selectedEndSlot, washingStartHour, washingEndHour]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedSlot(null);
        setSelectedEndSlot(null);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const handleDeleteReservation = async (event: CalendarEvent) => {
    if (event.user_id !== user?.id) {
      alert("You can only delete your own reservations.");
      return;
    }

    // First, delete the associated budget entry
    const reservationIds = event.ids || [event.id];
    const { error: budgetError } = await supabase
      .from('budget_entries')
      .delete()
      .in('reservation_id', reservationIds);

    if (budgetError) {
      console.error('Error deleting budget entry:', budgetError);
      alert('Failed to delete associated budget entry. Please try again.');
      return;
    }

    const { error: reservationError } = await supabase
      .from('washing_reservations')
      .delete()
      .in('id', reservationIds);

    if (reservationError) {
      console.error('Error deleting reservation:', reservationError);
      alert('Failed to delete reservation. Please try again.');
    } else {
      setWashingEvents(prevEvents => prevEvents.filter(e => !reservationIds.includes(e.id)));
    }
  };

  const handleReservation = async () => {
    if (!selectedSlot || !selectedEndSlot) {
      showConfirmationDialog('Please select a time slot first');
      return;
    }

    const { start: startTime, end: endTime } = clampWashingRange(
      selectedSlot,
      selectedEndSlot,
      washingStartHour,
      washingEndHour
    );
    if (endTime <= startTime) {
      showConfirmationDialog('Please select a time within the washing hours.');
      return;
    }

    const now = new Date();
    if (startTime < now) {
      showConfirmationDialog("You cannot book a time slot in the past. Please select a future time slot.");
      return;
    }

    const reserveButton = document.querySelector('.reserve-time-button');
    if (reserveButton) {
      reserveButton.textContent = '✓';
      reserveButton.classList.add('reserved');
    }

    const { data: reservationData, error: reservationError } = await supabase
      .from('washing_reservations')
      .insert({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        washing_count: washingCount,
        drying_count: dryingCount,
        user_id: user?.id,
        user_name: displayName,
      })
      .select();

    if (reservationError) {
      console.error('Error making reservation:', reservationError);
      showConfirmationDialog('Failed to make reservation. Please try again.');
      if (reserveButton) {
        reserveButton.textContent = 'Reserve Time';
        reserveButton.classList.remove('reserved');
      }
    } else {
      console.log('Reservation made successfully');

      // Calculate the cost of the washing reservation
      const cost = await calculateWashingCost(washingCount, dryingCount);

      if (cost === 0) {
        console.error('Error calculating washing cost');
        // Delete the reservation if cost calculation failed
        await supabase
          .from('washing_reservations')
          .delete()
          .match({ id: reservationData[0].id });
        showConfirmationDialog('Failed to calculate washing cost. Reservation has been cancelled.');
        return;
      }

      // Create a budget entry for the washing reservation
      const reservationDate = format(startTime, 'd MMM', { locale: enGB });
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
        .insert({
          user_id: user?.id,
          amount: -cost, // Negative amount as it's a withdrawal
          type: 'withdrawal',
          description: description,
          reservation_id: reservationData[0].id, // Link to the washing reservation
        });

      if (budgetError) {
        console.error('Error creating budget entry:', budgetError);
        // Delete the reservation if budget entry creation failed
        await supabase
          .from('washing_reservations')
          .delete()
          .match({ id: reservationData[0].id });
        showConfirmationDialog('Failed to create budget entry. Reservation has been cancelled.');
        return;
      }

      // Immediately update the washingEvents state with the new reservation
      const newEvent: CalendarEvent = {
        id: reservationData[0].id,
        title: displayName,
        start: new Date(startTime),
        end: new Date(endTime),
        allDay: false,
        user_id: user?.id || '',
      };
      setWashingEvents(prevEvents => [...prevEvents, newEvent]);

      // Update the "Selected Time" label to "Time has been reserved ✅"
      const selectedTimeLabel = document.querySelector('.selected-time-label');
      if (selectedTimeLabel) {
        selectedTimeLabel.textContent = 'Time has been reserved ✅';
      }

      // Start fading out immediately
      if (reserveButton) {
        reserveButton.classList.add('fade-out');
      }

      // Reset form after the fade-out animation
      setTimeout(() => {
        setSelectedSlot(null);
        setSelectedEndSlot(null);
        setWashingCount(1);
        setDryingCount(0);
        setHours(1);
        if (reserveButton) {
          reserveButton.textContent = 'Reserve Time';
          reserveButton.classList.remove('reserved', 'fade-out');
        }
        // Reset the "Selected Time" label
        if (selectedTimeLabel) {
          selectedTimeLabel.textContent = 'Selected Time';
        }
      }, 5000); // 5 seconds fade out
    }
  };

  const generateReservationOptions = () => {
    const options: string[] = [];
    const currentDate = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const workStartHour = parseInt(workStartTime);
    const workEndHour = parseInt(workEndTime);

    const isTimeSlotOccupied = (start: Date, end: Date) => {
      return washingEvents.some(event =>
        (start < new Date(event.end) && end > new Date(event.start))
      );
    };

    const isOutsideWorkHours = (start: Date, end: Date) => {
      if (!hasWorkSchedule) return true;
      const startDay = start.getDay();
      const endDay = end.getDay();
      const workStart = parseInt(workStartTime);
      const workEnd = parseInt(workEndTime);

      // Check if it's a weekend (Saturday or Sunday)
      if (startDay === 0 || startDay === 6 || endDay === 0 || endDay === 6) return true;

      // For weekdays, check if the entire slot is outside work hours
      return (
        start.getHours() >= workEnd ||
        end.getHours() <= workStart
      );
    };

    const isAvailableSlot = (start: Date, end: Date) => {
      return isOutsideWorkHours(start, end) &&
        !isTimeSlotOccupied(start, end) &&
        (!avoidChurchTime || (!isChurchTime(start, churchDay, churchStartHour, churchEndHour) && !isChurchTime(new Date(end.getTime() - 1), churchDay, churchStartHour, churchEndHour))) &&
        (start.getHours() >= washingStartHour && end.getHours() <= washingEndHour);
    };

    const targetOptions = 7;

    for (let i = 0; i < 14 && options.length < targetOptions; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);

      // Skip days that are in the past
      if (date < new Date(new Date().setHours(0, 0, 0, 0))) continue;

      const dayName = daysOfWeek[date.getDay()];
      const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

      let weekInfo;
      if (date.getTime() < new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).getTime()) {
        weekInfo = 'This Week';
      } else {
        weekInfo = 'Next Week';
      }

      const currentHour = currentDate.getHours();

      // Try to find available slots within washing hours, allowing reservations up to one hour before the end time
      for (let hour = washingStartHour; hour <= washingEndHour - (hours || 1); hour++) {
        const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0);
        const endTime = new Date(startTime.getTime() + (hours || 1) * 60 * 60 * 1000);

        if (isAvailableSlot(startTime, endTime) &&
          (date.getDate() !== currentDate.getDate() || hour > currentHour)) {
          const slotStartTime = `${hour.toString().padStart(2, '0')}:00`;
          const slotEndTime = `${endTime.getHours().toString().padStart(2, '0')}:00`;
          const timeOfDay = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
          const option = `${dateString} ${slotStartTime}-${slotEndTime} ${dayName} ${weekInfo} ${timeOfDay}`;

          options.push(option);

          if (options.length >= targetOptions) break;
        }
      }

      if (options.length >= targetOptions) break;
    }

    options.sort((a, b) => a.localeCompare(b));
    setReservationOptions(options);
  };

  const handleOptionSelect = (option: string) => {
    const [dateStr, timeRange] = option.split(' ');
    const [startTime, endTime] = timeRange.split('-');

    const [year, month, day] = dateStr.split('-').map(Number);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startDateTime = new Date(year, month - 1, day, startHour, startMinute);
    const endDateTime = new Date(year, month - 1, day, endHour, endMinute);

    setSelectedSlot(startDateTime);
    setSelectedEndSlot(endDateTime);
    setIsDialogOpen(false);
  };

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDialogOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const EventComponent: React.FC<EventProps<CalendarEvent>> = ({ event }) => (
    <div className="rbc-event-content washing-event">
      <span className="washing-event-time md:hidden">
        <span>{format(event.start, 'HH:mm')}</span>
        <span className="washing-event-dash">-</span>
        <span>{format(event.end, 'HH:mm')}</span>
      </span>
      <span className="washing-event-name">{event.title}</span>
      {event.user_id === user?.id && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteReservation(event);
          }}
          className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .calendar-container .rbc-calendar {
            padding: 0;
          }
          .calendar-container .rbc-header {
            padding: 0 !important;
          }
        }
        .selected-time.first-selected-cell::after {
          content: attr(title);
          position: absolute;
          top: 0;
          left: 0;
          background-color: transparent;
          color: hsl(var(--primary-foreground));
          font-size: 0.75rem;
          z-index: 1;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (max-width: 768px) {
          .selected-time.first-selected-cell::after {
            white-space: normal;
            word-break: break-word;
          }
        }
      `}</style>
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
            <CardTitle>Washing Reservation</CardTitle>
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              Washing Times: {washingStartHour}:00 - {washingEndHour}:00
            </p>
          </CardHeader>
          <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div
                className="bg-secondary p-4 rounded-lg shadow-sm cursor-pointer select-none max-w-md flex-1 order-2 md:order-1"
                onClick={(e) => {
                  e.preventDefault();
                  setHasWorkSchedule(!hasWorkSchedule);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="hasWorkSchedule" className="text-lg font-semibold cursor-pointer" onClick={(e) => e.stopPropagation()}>Work Schedule</Label>
                  <Checkbox
                    id="hasWorkSchedule"
                    checked={hasWorkSchedule}
                    onCheckedChange={(checked) => setHasWorkSchedule(checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Avoid Monday - Friday</p>
                {hasWorkSchedule && (
                  <div className="mt-2 flex items-center space-x-2" onClick={(e) => {e.stopPropagation();setHasWorkSchedule(!hasWorkSchedule);}}>
                    <Input
                      id="workStartTime"
                      type="number"
                      min="0"
                      max="23"
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                      className="w-20"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>to</span>
                    <Input
                      id="workEndTime"
                      type="number"
                      min="0"
                      max="23"
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                      className="w-20"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
              <div
                className="bg-secondary p-4 rounded-lg shadow-sm cursor-pointer select-none max-w-md flex-1 order-1 md:order-2"
                onClick={(e) => {
                  e.preventDefault();
                  setAvoidChurchTime(!avoidChurchTime);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="avoidChurchTime" className="text-lg font-semibold cursor-pointer" onClick={(e) => e.stopPropagation()}>Church Time</Label>
                  <Checkbox
                    id="avoidChurchTime"
                    checked={avoidChurchTime}
                    onCheckedChange={(checked) => setAvoidChurchTime(checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Avoid {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][churchDay]} {churchStartHour}:00-{churchEndHour}:00
                </p>
              </div>
            </div>
            <div className="bg-secondary p-4 rounded-lg shadow-sm max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-4">Time Reservation</h3>
              <div className="flex flex-wrap gap-4 items-end mb-4">
                <div className="flex-1 min-w-[80px] max-w-[100px]">
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    type="number"
                    value={hours}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      setHours(value === '' ? '' : Math.max(1, value as number));
                    }}
                    min={1}
                  />
                </div>
                <div className="flex-1 min-w-[80px] max-w-[100px]">
                  <Label htmlFor="washing">Washing</Label>
                  <Input
                    id="washing"
                    type="number"
                    value={washingCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setWashingCount(isNaN(value) ? 0 : Math.max(0, value));
                    }}
                    min={0}
                  />
                </div>
                <div className="flex-1 min-w-[80px] max-w-[100px]">
                  <Label htmlFor="drying">Drying</Label>
                  <Input
                    id="drying"
                    type="number"
                    value={dryingCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setDryingCount(isNaN(value) ? 0 : Math.max(0, value));
                    }}
                    min={0}
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Button 
                    onClick={() => {
                      setIsDialogOpen(true);
                      generateReservationOptions();
                    }} 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Find Time
                  </Button>
                </div>
              </div>
              <div className="mt-2">
                {selectedSlot && selectedEndSlot && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label className="text-lg font-semibold selected-time-label">Selected Time</Label><br />
                      <span>{`${format(selectedSlot, 'MMMM d, yyyy HH:mm', { locale: enGB })} - ${format(selectedEndSlot, 'HH:mm')}`}</span>
                    </div>
                    <Button
                      onClick={handleReservation}
                      className="reserve-time-button flex items-center gap-2 mt-2 sm:mt-0"
                    >
                      <Clock className="w-4 h-4" />
                      Reserve Time
                    </Button>
                  </div>
                )}
              </div>
              {isDialogOpen && (
                <div className="mt-4 space-y-2">
                  <div className="flex flex-col sm:flex-wrap gap-2">
                    {reservationOptions.map((option: string, index: number) => {
                      const [dateStr, timeRange, dayName, weekInfo, timeOfDay] = option.split(' ');
                      const [year, month, day] = dateStr.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      const formattedDate = date.toLocaleString('en-GB', { day: '2-digit', month: 'short' });

                      return (
                        <Button
                          key={index}
                          onClick={() => handleOptionSelect(option)}
                          className="flex-grow sm:w-fit justify-start items-center text-left h-auto py-2"
                        >
                          <div className="flex flex-col items-start">
                            <div className="flex flex-wrap items-center w-full gap-2">
                              <div className="bg-primary-foreground text-primary text-xs px-2 py-1 rounded mr-2">{dayName}</div>
                              <div className="bg-primary-foreground text-primary text-xs px-2 py-1 rounded mr-2">{timeRange}</div>
                              <div className="bg-primary-foreground text-primary text-xs px-2 py-1 rounded mr-2">{formattedDate}</div>
                              {weekInfo === 'Next Week' && (
                                <div className="bg-primary-foreground text-primary text-xs px-2 py-1 rounded mr-2">{weekInfo}</div>
                              )}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
      <div className="max-w-5xl mx-auto mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Washing Calendar</CardTitle>
          </CardHeader>
          <CardContent className="h-full calendar-container">
            <style>{`
              @media (max-width: 768px) {
                .calendar-container .rbc-calendar {
                  margin-left: -1rem;
                  margin-right: -1rem;
                  width: calc(100% + 2rem);
                }
              }
            `}</style>
          <div className="custom-toolbar">
            <Button onClick={handlePreviousWeek}>&lt;</Button>
            <span className="flex flex-wrap items-center justify-center">
              <span>{format(startOfWeek(currentDate, weekOptions), 'MMM d')} - {format(endOfWeek(currentDate, weekOptions), 'MMM d, yyyy')}</span>
              {isSameWeek(currentDate, new Date(), weekOptions) && <span className="whitespace-nowrap">&nbsp;(current week)</span>}
              {isSameWeek(currentDate, addWeeks(new Date(), 1), weekOptions) && <span className="whitespace-nowrap">&nbsp;(next week)</span>}
              {isSameWeek(currentDate, subWeeks(new Date(), 1), weekOptions) && <span className="whitespace-nowrap">&nbsp;(last week)</span>}
            </span>
            <Button onClick={handleNextWeek}>&gt;</Button>
          </div>
          <div className="h-full">
            <Calendar
              localizer={calendarLocalizer}
              culture="en-GB"
              events={displayedEvents}
              startAccessor="start"
              endAccessor="end"
              defaultView={Views.WEEK}
              views={[Views.WEEK]}
              className="h-full hide-allday-cell"
              style={{ height: 'calc(100% - 40px)' }}
              min={new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), washingStartHour, 0, 0)}
              max={new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), Math.max(washingStartHour, washingEndHour - 1), 59, 0)}
              date={currentDate}
              onNavigate={(date) => setCurrentDate(date)}
              eventPropGetter={(event) => {
                const backgroundColor = getUserColor(event.user_id);
                return {
                  style: {
                    backgroundColor,
                    borderColor: backgroundColor,
                    color: contrastTextColor(backgroundColor),
                  },
                };
              }}
              formats={{
                timeGutterFormat: formatTimeSlot,
                eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${formatTimeSlot(start)} - ${formatTimeSlot(end)}`,
                dayFormat: (date: Date) => {
                  const isMobile = window.innerWidth <= 768;
                  return isMobile
                    ? format(date, 'EEE', { locale: enGB })
                    : `${format(date, 'd')} - ${format(date, 'EEE', { locale: enGB })}`;
                },
              }}
              step={60}
              timeslots={1}
              getNow={() => new Date()}
              components={{
                event: EventComponent,
                timeSlotWrapper: (props: any) => {
                  const lastSelectedStart = selectedEndSlot
                    ? new Date(selectedEndSlot.getTime() - 60 * 60 * 1000)
                    : null;
                  const isConfirmSlot = !!(
                    lastSelectedStart &&
                    props.value.getTime() === lastSelectedStart.getTime()
                  );

                  if (!isConfirmSlot) {
                    return <TimeSlotWrapper {...props} />;
                  }

                  const isBottomRow = props.value.getHours() >= washingEndHour - 1;
                  const slot = React.Children.only(props.children) as React.ReactElement<{
                    className?: string;
                    style?: React.CSSProperties;
                    children?: React.ReactNode;
                  }>;
                  const styledSlot = TimeSlotWrapper({ ...props, children: slot });
                  const node = (
                    React.isValidElement(styledSlot) ? styledSlot : slot
                  ) as React.ReactElement<{
                    className?: string;
                    style?: React.CSSProperties;
                    children?: React.ReactNode;
                  }>;

                  return React.cloneElement(node, {
                    className: `${node.props.className || ''} relative overflow-visible`,
                    style: { ...node.props.style, overflow: 'visible' },
                    children: (
                      <>
                        {node.props.children}
                        <Button
                          className={`button-check absolute z-30 ${isBottomRow ? 'top-1' : 'bottom-1'} right-1 rounded-full w-6 h-6 p-0 flex items-center justify-center bg-green-500 hover:bg-green-600`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReservation();
                          }}
                        >
                          ✓
                        </Button>
                      </>
                    ),
                  });
                },
              }}
              selectable={true}
              onSelectSlot={handleSlotSelect}
              slotPropGetter={(date) => {
                const isDisabled = (
                  (hasWorkSchedule && date.getDay() >= 1 && date.getDay() <= 5 && 
                   (date.getHours() >= parseInt(workStartTime) && date.getHours() < parseInt(workEndTime))) ||
                  (avoidChurchTime && date.getDay() === parseInt(churchDay.toString()) && 
                   date.getHours() >= churchStartHour && date.getHours() < churchEndHour)
                );

                if (selectedSlot && selectedEndSlot &&
                  date >= selectedSlot &&
                  date < selectedEndSlot) {
                  const isFirstCell = date.getTime() === selectedSlot.getTime();
                  const isLastCell = new Date(date.getTime() + 60 * 60 * 1000) > selectedEndSlot;
                  let className = 'selected-time';
                  if (isFirstCell) className += ' first-selected-cell';
                  if (isLastCell) className += ' last-selected-cell';
                  return {
                    className,
                    style: {
                      backgroundColor: 'hsl(var(--primary) / 30%)',
                      position: 'relative',
                    },
                    ...(isFirstCell ? { title: `${format(selectedSlot, 'HH:mm')} - ${format(selectedEndSlot, 'HH:mm')}` } : {}),
                  };
                }

                if (isDisabled) {
                  return {
                    style: {
                      backgroundColor: 'rgba(255, 0, 0, 0.1)', // Slight red background
                    },
                  };
                }

                return {};
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default WashingReservation;
