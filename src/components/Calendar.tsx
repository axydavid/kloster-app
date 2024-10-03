import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { Event } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

// Setup the localizer by providing the moment object
const localizer = momentLocalizer(moment);

interface CalendarEvent extends Event {
  title: string;
  start: Date;
  end: Date;
}

const MyCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      title: 'Sample Event',
      start: new Date(),
      end: new Date(new Date().setHours(new Date().getHours() + 1)),
    },
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservation Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: '500px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default MyCalendar;
