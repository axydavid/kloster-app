
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { createClient } from '@supabase/supabase-js';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import Toast from './Toast';
import { format, addMonths, subMonths } from 'date-fns';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

const CustomEvent = ({ event }: { event: Reservation }) => {
  return (
    <div className="flex justify-between items-center p-1">
      <span>{event.guest_name}</span>
    </div>
  );
};

// Add custom styles
const CustomStyles = () => (
  <style>{`
    .react-datepicker-wrapper {
      width: 100%;
    }
    .react-datepicker {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      border: 1px solid hsl(var(--border));
      border-radius: 0.5rem;
      background-color: hsl(var(--background));
      z-index: 10;
      font-size: 1rem;
      margin-top: -8px; /* Changed from 8px to -8px */
    }
    .react-datepicker-popper {
      z-index: 10;
    }
    .react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle,
    .react-datepicker-popper[data-placement^="top"] .react-datepicker__triangle {
      display: none;
    }
    .react-datepicker__header {
      background-color: hsl(var(--secondary));
      border-bottom: 1px solid hsl(var(--border));
      padding: 1rem 0;
    }
    .react-datepicker__current-month, .react-datepicker-time__header, .react-datepicker-year-header {
      font-weight: 600;
      color: hsl(var(--foreground));
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
    }
    .react-datepicker__day-name, .react-datepicker__day, .react-datepicker__time-name {
      color: hsl(var(--foreground));
      width: 2.5rem;
      height: 2.5rem;
      line-height: 2.5rem;
      margin: 0.2rem;
    }
    .react-datepicker__day {
      border-radius: 0.3rem;
    }
    .react-datepicker__month {
      margin: 0.75rem;
    }
    .react-datepicker__navigation {
      top: 1.5rem;
      line-height: 1.7rem;
      border: 0.45rem solid transparent;
    }
    .react-datepicker__navigation--previous {
      left: 1rem;
    }
    .react-datepicker__navigation--next {
      right: 1rem;
    }
    .react-datepicker__navigation-icon::before {
      display: none;
    }
    .react-datepicker__day:hover, .react-datepicker__month-text:hover, .react-datepicker__quarter-text:hover, .react-datepicker__year-text:hover {
      background-color: hsl(var(--accent));
    }
    .react-datepicker__day--selected,
    .react-datepicker__day--range-start,
    .react-datepicker__day--range-end,
    .react-datepicker__day--in-range.react-datepicker__day--range-start,
    .react-datepicker__day--in-range.react-datepicker__day--range-end,
    .react-datepicker__day--in-selecting-range.react-datepicker__day--selecting-range-start,
    .react-datepicker__day--in-selecting-range.react-datepicker__day--selecting-range-end {
      background-color: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
    }
    .react-datepicker__day--in-selecting-range:not(.react-datepicker__day--selecting-range-start):not(.react-datepicker__day--selecting-range-end),
    .react-datepicker__day--in-range:not(.react-datepicker__day--range-start):not(.react-datepicker__day--range-end) {
      background-color: hsl(var(--accent));
      color: hsl(var(--accent-foreground));
    }
    .react-datepicker__day--keyboard-selected:not(.react-datepicker__day--in-range):not(.react-datepicker__day--range-start):not(.react-datepicker__day--range-end):not(.react-datepicker__day--in-selecting-range) {
      background-color: hsl(var(--accent));
      color: hsl(var(--accent-foreground));
    }
    .react-datepicker__input-container input {
      width: 100%;
      height: 2.5rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
      border-radius: 0.375rem;
      border: 1px solid hsl(var(--input));
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
    }
    .react-datepicker__input-container input:focus {
      outline: none;
      ring: 2px solid hsl(var(--ring));
      ring-offset: 2px;
    }
    .react-datepicker__input-container {
      position: relative;
    }
    .react-datepicker__close-icon {
      position: absolute;
      top: 50%;
      right: 10px;
      transform: translateY(-50%);
      height: 22px;
      width: 22px;
      min-width: 22px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .react-datepicker__close-icon::after {
      content: '×';
      font-size: 16px;
      height: 20px;
      width: 20px;
      min-width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border-radius: 50%;
      padding-bottom: 6px;
    }
    .react-datepicker__input-container input {
      padding-right: 40px; /* Make room for the close icon */
    }
  `}</style>
);

const localizer = momentLocalizer(moment);

interface Reservation {
  id: string;
  start_date: Date;
  end_date: Date;
  guest_name: string;
  notes?: string;
}

const GuestRoom: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Date | undefined, Date | undefined]>([undefined, undefined]);
  const [startDate, endDate] = dateRange;
  const [guestName, setGuestName] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [notes, setNotes] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const prevMonth = (date: Date) => subMonths(date, 1);
  const nextMonth = (date: Date) => addMonths(date, 1);

  const showConfirmationDialog = useCallback(async (message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const dialog = document.createElement('div');
      dialog.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in ease-out duration-300" onclick="this.classList.add('animate-out', 'fade-out'); setTimeout(() => { this.remove(); resolve(false); }, 250);">
          <div class="bg-white p-6 rounded-lg shadow-xl animate-in zoom-in-50 duration-300" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold">Confirmation</h2>
              <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').classList.add('animate-out', 'fade-out'); setTimeout(() => { this.closest('.fixed').remove(); resolve(false); }, 250);">✕</button>
            </div>
            <p class="mb-4">${message}</p>
            <div class="flex justify-end">
              <button class="px-4 py-2 bg-blue-500 text-white rounded" onclick="this.closest('.fixed').classList.add('animate-out', 'fade-out'); setTimeout(() => { this.closest('.fixed').remove(); resolve(false); }, 250);">OK</button>
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

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from('guest_room_reservation')
      .select('*');
    if (error) {
      console.error('Error fetching reservations:', error);
    } else {
      setReservations(data.map((reservation: any) => ({
        ...reservation,
        start_date: new Date(reservation.start_date),
        end_date: new Date(reservation.end_date),
      })));
    }
  };

  const handleBooking = async () => {
    if (!startDate || !endDate || !guestName) {
      setToastMessage('Please select a date range and enter a guest name');
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);  // Set to start of day for accurate comparison
    if (startDate < now) {
      await showConfirmationDialog("You cannot book a time slot in the past. Please select a future time slot.");
      return;
    }

    // Check for overlaps
    const overlap = reservations.some(reservation => {
      const reservationStart = moment(reservation.start_date);
      const reservationEnd = moment(reservation.end_date);
      const newStart = moment(startDate);
      const newEnd = moment(endDate);

      // Check if there's more than one day of overlap
      return (newStart.isBefore(reservationEnd) && newEnd.isAfter(reservationStart))
        && !(newStart.isSame(reservationEnd, 'day') || newEnd.isSame(reservationStart, 'day'));
    });

    if (overlap) {
      await showConfirmationDialog('This booking overlaps with an existing reservation by more than one day.');
      return;
    }

    const { data, error } = await supabase
      .from('guest_room_reservation')
      .insert([
        {
          start_date: moment(startDate).format('YYYY-MM-DD'),
          end_date: moment(endDate).format('YYYY-MM-DD'),
          guest_name: guestName,
          notes: notes
        },
      ]);

    if (error) {
      console.error('Error booking reservation:', error);
      setToastMessage('Failed to book reservation');
    } else {
      setToastMessage('Reservation booked successfully');
      fetchReservations();
      setDateRange([undefined, undefined]);
      setGuestName('');
      setNotes('');
    }
  };

  const handleDeleteReservation = async (id: string) => {
    const { error } = await supabase
      .from('guest_room_reservation')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting reservation:', error);
      setToastMessage('Failed to delete reservation');
    } else {
      setToastMessage('Reservation deleted successfully');
      fetchReservations();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <CustomStyles />
      <Card className="mb-8 max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Guest Room Booking</CardTitle>
          <CardDescription>Select dates and enter guest details to book the guest room.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <DatePicker
                id="date-range"
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={async (update: [Date | null, Date | null]) => {
                  const [newStartDate, newEndDate] = update;
                  if (newStartDate && newEndDate) {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);  // Set to start of day for accurate comparison
                    if (newStartDate < now) {
                      await showConfirmationDialog("You cannot book a time slot in the past. Please select a future time slot.");
                      setDateRange([undefined, undefined]);
                      return;
                    }

                    const overlap = reservations.some(reservation => {
                      const reservationStart = moment(reservation.start_date);
                      const reservationEnd = moment(reservation.end_date);
                      const newStart = moment(newStartDate);
                      const newEnd = moment(newEndDate);

                      // Check if there's more than one day of overlap
                      return (newStart.isBefore(reservationEnd) && newEnd.isAfter(reservationStart))
                        && !(newStart.isSame(reservationEnd, 'day') || newEnd.isSame(reservationStart, 'day'));
                    });

                    if (overlap) {
                      await showConfirmationDialog('This date range overlaps with an existing reservation by more than one day.');
                      setDateRange([undefined, undefined]);
                      return;
                    }
                  }
                  setDateRange([newStartDate || undefined, newEndDate || undefined]);
                }}
                isClearable={true}
                placeholderText="Select date range"
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                dateFormat="dd MMM yyyy"
                minDate={new Date().setHours(0, 0, 0, 0)}  // Allow selecting from the start of today
                renderCustomHeader={({
                  date,
                  decreaseMonth,
                  increaseMonth,
                  prevMonthButtonDisabled,
                  nextMonthButtonDisabled,
                }) => (
                  <div className="flex items-center justify-between px-[26px] py-2">
                    <span className="text-lg text-gray-700">
                      {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="space-x-2">
                      <button
                        onClick={decreaseMonth}
                        disabled={prevMonthButtonDisabled}
                        type="button"
                        className={`
                          ${prevMonthButtonDisabled && 'cursor-not-allowed opacity-50'}
                          inline-flex p-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500
                        `}
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>

                      <button
                        onClick={increaseMonth}
                        disabled={nextMonthButtonDisabled}
                        type="button"
                        className={`
                          ${nextMonthButtonDisabled && 'cursor-not-allowed opacity-50'}
                          inline-flex p-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500
                        `}
                      >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
              />
            </div>
            <div>
              <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
              <Input
                id="guest-name"
                type="text"
                placeholder="Enter guest name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleBooking();
                  }
                }}
                className="w-full h-10 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                id="notes"
                placeholder="Enter any additional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleBooking} className="w-full">Book Reservation</Button>
        </CardFooter>
      </Card>
      <Card className="mt-8 sm:p-4 p-0">
        <CardHeader className="sm:px-0 px-4">
          <div className="flex justify-between items-center">
            <CardTitle className='flex'>Reservation<div className='hidden sm:inline'>&nbsp;Overview</div></CardTitle>
            {selectedReservation ? (
              <div className="flex items-center space-x-2">
                <span className="font-medium hidden sm:inline">Selected Booking:</span>
                <span>
                  {moment(selectedReservation.start_date).format('MMM D')} - {moment(selectedReservation.end_date).format('MMM D')}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDeleteReservation(selectedReservation.id);
                    setSelectedReservation(null);
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="sm:p-0 p-0">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <Button onClick={() => setCurrentDate(prevMonth(currentDate))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-lg font-semibold">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <Button onClick={() => setCurrentDate(nextMonth(currentDate))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Calendar
              localizer={localizer}
              events={reservations}
              startAccessor="start_date"
              endAccessor="end_date"
              titleAccessor="guest_name"
              style={{ height: 500 }}
              views={['month']}
              defaultView='month'
              date={currentDate}
              onNavigate={(date) => setCurrentDate(date)}
              onSelectEvent={(event) => setSelectedReservation(event as Reservation)}
              components={{
                event: (props) => (
                  <CustomEvent
                    event={props.event as Reservation}
                  />
                ),
              }}
            />
          </div>
        </CardContent>
      </Card>
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

export default GuestRoom;
