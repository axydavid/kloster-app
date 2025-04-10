import React, { useState, useEffect, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Checkbox } from "./ui/checkbox"
import Users from './Users';
import { UserContext } from './Layout';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

const AdminPage: React.FC = () => {
  const users = useContext(UserContext);
  const [settings, setSettings] = useState({
    washingStartHour: 8,
    washingEndHour: 21,
    budgetPerMeal: 0,
    budgetPerLaundry: 0,
    currencyType: ':-',
    churchStartHour: 11,
    churchEndHour: 12,
    churchDay: 6, // Default to Saturday (6)
    suspendedWeekdays: [] as number[]
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('admin_settings').select('*').single();
    if (error) {
      console.error('Error fetching settings:', error);
    } else {
      setSettings({
        washingStartHour: data.washing_start_hour,
        washingEndHour: data.washing_end_hour,
        budgetPerMeal: data.budget_per_meal,
        budgetPerLaundry: data.budget_per_laundry,
        currencyType: data.currency_type,
        churchStartHour: data.church_start_hour,
        churchEndHour: data.church_end_hour,
        churchDay: data.church_day ?? 6, // Default to Saturday (6) if not set
        suspendedWeekdays: data.suspended_weekdays || []
      });
    }
  };

  const updateSettings = async () => {
    const { error } = await supabase
      .from('admin_settings')
      .update({
        washing_start_hour: settings.washingStartHour,
        washing_end_hour: settings.washingEndHour,
        budget_per_meal: settings.budgetPerMeal,
        budget_per_laundry: settings.budgetPerLaundry,
        currency_type: settings.currencyType,
        church_start_hour: settings.churchStartHour,
        church_end_hour: settings.churchEndHour,
        church_day: settings.churchDay,
        suspended_weekdays: settings.suspendedWeekdays
      })
      .eq('id', 1);

    if (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings. Please try again.');
    } else {
      alert('Settings updated successfully');
    }
  };

  const handleWeekdayToggle = (day: number) => {
    setSettings(prev => ({
      ...prev,
      suspendedWeekdays: prev.suspendedWeekdays.includes(day)
        ? prev.suspendedWeekdays.filter(d => d !== day)
        : [...prev.suspendedWeekdays, day]
    }));
  };

  return (
    <div className="space-y-6 mx-auto max-w-5xl">
      <div className="flex flex-col gap-6">
        <Card className="flex-1 w-full">
          <CardHeader>
            <CardTitle>Admin Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Washing Hours</h3>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <Label htmlFor="washingStartHour">Washing Start Hour</Label>
                      <Input
                        id="washingStartHour"
                        type="number"
                        value={settings.washingStartHour}
                        onChange={(e) => setSettings({...settings, washingStartHour: parseInt(e.target.value)})}
                        min={0}
                        max={23}
                        className="max-w-[200px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="washingEndHour">Washing End Hour</Label>
                      <Input
                        id="washingEndHour"
                        type="number"
                        value={settings.washingEndHour}
                        onChange={(e) => setSettings({...settings, washingEndHour: parseInt(e.target.value)})}
                        min={0}
                        max={23}
                        className="max-w-[200px]"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Budget Settings</h3>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <Label htmlFor="budgetPerMeal">Budget per meal</Label>
                      <Input
                        id="budgetPerMeal"
                        type="number"
                        value={settings.budgetPerMeal}
                        onChange={(e) => setSettings({...settings, budgetPerMeal: parseFloat(e.target.value)})}
                        className="max-w-[120px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="budgetPerLaundry">Budget per laundry</Label>
                      <Input
                        id="budgetPerLaundry"
                        type="number"
                        value={settings.budgetPerLaundry}
                        onChange={(e) => setSettings({...settings, budgetPerLaundry: parseFloat(e.target.value)})}
                        className="max-w-[120px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currencyType">Currency Type</Label>
                      <Select
                        value={settings.currencyType}
                        onValueChange={(value) => setSettings({...settings, currencyType: value})}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="$">$</SelectItem>
                          <SelectItem value=":-">:-</SelectItem>
                          <SelectItem value="€">€</SelectItem>
                          <SelectItem value="£">£</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Church Time</h3>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <Label htmlFor="churchDay">Church Day</Label>
                      <Select
                        value={settings.churchDay.toString()}
                        onValueChange={(value) => setSettings({...settings, churchDay: parseInt(value)})}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="churchStartHour">Church Start Hour</Label>
                      <Input
                        id="churchStartHour"
                        type="number"
                        value={settings.churchStartHour}
                        onChange={(e) => setSettings({...settings, churchStartHour: parseInt(e.target.value)})}
                        min={0}
                        max={23}
                        className="max-w-[200px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="churchEndHour">Church End Hour</Label>
                      <Input
                        id="churchEndHour"
                        type="number"
                        value={settings.churchEndHour}
                        onChange={(e) => setSettings({...settings, churchEndHour: parseInt(e.target.value)})}
                        min={0}
                        max={23}
                        className="max-w-[200px]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Lunch Schedule</h3>
                  <Label>Suspended Weekdays for Lunch</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <Button
                        key={day}
                        variant="outline"
                        className={`flex-1 min-w-[3rem] text-xs sm:text-sm ${settings.suspendedWeekdays.includes(index) ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={() => handleWeekdayToggle(index)}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Button onClick={updateSettings} className="mt-4">Update Settings</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 w-full">
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Users />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;
