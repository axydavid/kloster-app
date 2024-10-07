import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Toast from './Toast';
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Utensils } from 'lucide-react';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

interface DinnerDays {
  [key: string]: {
    status: 'always' | 'never' | 'default' | 'takeaway';
    portions: string;
  };
}

const presetColors = [
  { hex: '#1E40AF', name: 'Royal Blue' },
  { hex: '#047857', name: 'Forest Green' },
  { hex: '#B91C1C', name: 'Crimson Red' },
  { hex: '#6D28D9', name: 'Deep Purple' },
  { hex: '#0E7490', name: 'Teal' },
  { hex: '#7C2D12', name: 'Rust Brown' },
  { hex: '#831843', name: 'Burgundy' },
  { hex: '#3730A3', name: 'Indigo' },
  { hex: '#92400E', name: 'Amber' },
  { hex: '#9D174D', name: 'Magenta' },
  { hex: '#059669', name: 'Emerald' },
  { hex: '#D97706', name: 'Orange' },
  { hex: '#4338CA', name: 'Cobalt Blue' },
  { hex: '#0891B2', name: 'Cyan' },
  { hex: '#BE185D', name: 'Hot Pink' },
  { hex: '#15803D', name: 'Kelly Green' }
];

const UserSettings: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [iconColor, setIconColor] = useState('#007bff');
  const [portions, setPortions] = useState('2');
  const [weeklyPortions, setWeeklyPortions] = useState<{ [key: string]: string }>({});
  const [isColorPopoverOpen, setIsColorPopoverOpen] = useState(false);
  const [joinDinners, setJoinDinners] = useState(false);
  const [defaultResponse, setDefaultResponse] = useState<'never' | 'always'>('never');
  const [dinnerDays, setDinnerDays] = useState<DinnerDays>({
    Monday: { status: 'always', portions: portions },
    Tuesday: { status: 'always', portions: portions },
    Wednesday: { status: 'always', portions: portions },
    Thursday: { status: 'always', portions: portions },
    Friday: { status: 'always', portions: portions },
    Saturday: { status: 'always', portions: portions },
    Sunday: { status: 'always', portions: portions },
  });
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setDisplayName(user.user_metadata.display_name || user.email || '');
      setIconColor(user.user_metadata.iconColor || '#007bff');
      setPortions(user.user_metadata.portions || '2');
      setJoinDinners(user.user_metadata.joinDinners || false);
      setDefaultResponse(user.user_metadata.defaultResponse || 'never');
      const defaultDinnerDays = {
        Monday: { status: 'never', portions: portions },
        Tuesday: { status: 'never', portions: portions },
        Wednesday: { status: 'never', portions: portions },
        Thursday: { status: 'never', portions: portions },
        Friday: { status: 'never', portions: portions },
        Saturday: { status: 'never', portions: portions },
        Sunday: { status: 'never', portions: portions },
      };
      const userDinnerDays = user.user_metadata.dinnerDays || {};
      const formattedDinnerDays = Object.entries(defaultDinnerDays).reduce((acc, [day, defaultValue]) => {
        acc[day] = {
          status: userDinnerDays[day]?.status || defaultValue.status,
          portions: userDinnerDays[day]?.portions || defaultValue.portions
        };
        return acc;
      }, {} as DinnerDays);
      setDinnerDays(formattedDinnerDays);
    }
  };

  const handleDefaultResponseChange = (value: 'always' | 'never') => {
    setDefaultResponse(value);
    setDinnerDays(prevDays => {
      const newDays = { ...prevDays };
      Object.keys(newDays).forEach(day => {
        newDays[day] = { ...newDays[day], status: value };
      });
      return newDays;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedDinnerDays = Object.entries(dinnerDays).reduce((acc, [day, value]) => {
      acc[day] = {
        status: value.status,
        portions: value.portions
      };
      return acc;
    }, {} as { [key: string]: { status: string; portions: string } });

    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName.trim(),
        iconColor,
        portions: portions.trim(),
        joinDinners,
        defaultResponse,
        dinnerDays: formattedDinnerDays
      }
    });

    if (error) {
      console.error('Error updating user settings:', error);
      return false;
    } else {
      // Refresh user settings after successful update
      await fetchUserSettings();

      // Update admin_settings table
      if (joinDinners) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: adminSettings, error: adminError } = await supabase
            .from('admin_settings')
            .select('dinner')
            .single();

          if (adminError) {
            console.error('Error fetching admin settings:', adminError);
          } else {
            const currentDinner = adminSettings.dinner || [];
            if (!currentDinner.includes(user.id)) {
              const { error: updateError } = await supabase
                .from('admin_settings')
                .update({ dinner: [...currentDinner, user.id] })
                .eq('id', 1); // Assuming there's only one row in admin_settings

              if (updateError) {
                console.error('Error updating admin settings:', updateError);
              }
            }
          }
        }
      } else {
        // Remove user from dinner array if they've opted out
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: adminSettings, error: adminError } = await supabase
            .from('admin_settings')
            .select('dinner')
            .single();

          if (adminError) {
            console.error('Error fetching admin settings:', adminError);
          } else {
            const currentDinner = adminSettings.dinner || [];
            const updatedDinner = currentDinner.filter((id: string) => id !== user.id);
            const { error: updateError } = await supabase
              .from('admin_settings')
              .update({ dinner: updatedDinner })
              .eq('id', 1); // Assuming there's only one row in admin_settings

            if (updateError) {
              console.error('Error updating admin settings:', updateError);
            }
          }
        }
      }

      // Show toast message only after all operations are complete
      setShowToast(true);
      return true;
    }
  };

  const handleDinnerDayChange = (day: string, status: 'always' | 'never' | 'default' | 'takeaway') => {
    setDinnerDays(prev => {
      const newDays = { ...prev };
      newDays[day] = { ...newDays[day], status };
      return newDays;
    });
    // Automatically save the changes without showing the toast
    handleSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>);
  };

  const handlePortionChange = (day: string, portions: string) => {
    setDinnerDays(prev => {
      const newDays = { ...prev };
      newDays[day] = { ...newDays[day], portions };
      return newDays;
    });
    // Automatically save the changes without showing the toast
    handleSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(e);
    setShowToast(true);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>User Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {showToast && (
            <Toast
              message="Settings saved successfully!"
              onClose={() => setShowToast(false)}
            />
          )}
          <div className="flex flex-wrap -mx-2">
            <div className="w-full sm:w-1/2 px-2 mb-4">
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Display Name</label>
              <Input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full"
              />
            </div>
            <div className="w-full sm:w-1/2 px-2 mb-4">
              <label htmlFor="iconColor" className="block text-sm font-medium text-gray-700">Icon Color</label>
              <Popover open={isColorPopoverOpen} onOpenChange={setIsColorPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    className="mt-1 w-full"
                    style={{ backgroundColor: iconColor, color: 'white' }}
                  >
                    {presetColors.find(color => color.hex === iconColor)?.name || iconColor}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 max-w-md">
                  <div className="grid grid-cols-4 gap-2">
                    {presetColors.map((color) => (
                      <Button
                        key={color.hex}
                        type="button"
                        className="w-10 h-10"
                        style={{ backgroundColor: color.hex }}
                        onClick={() => {
                          setIconColor(color.hex);
                          setIsColorPopoverOpen(false);
                        }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-full sm:w-1/2 px-2 mb-4">
              <label htmlFor="portions" className="block text-sm font-medium text-gray-700">Default Portions</label>
              <Input
                type="number"
                id="portions"
                value={portions}
                onChange={(e) => setPortions(e.target.value)}
                min="0"
                step="0.5"
                className="mt-1 w-full"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="joinDinners"
                checked={joinDinners}
                onCheckedChange={(checked) => setJoinDinners(checked as boolean)}
              />
              <Label htmlFor="joinDinners" className="text-sm font-medium text-gray-700">Join Dinners</Label>
            </div>
            <p className="text-sm text-gray-500">
              Enable this to join community dinners. You'll be able to participate in meal planning and attend dinners.
            </p>
          </div>

          {joinDinners && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="defaultResponse" className="block text-sm font-medium text-gray-700">Default Response</Label>
                <Select value={defaultResponse} onValueChange={(value: 'always' | 'never') => handleDefaultResponseChange(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select default response" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never Join Automatically</SelectItem>
                    <SelectItem value="always">Always Join Automatically</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">Weekly Response Settings</Label>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <div key={day} className="flex flex-col items-center">
                      <Button
                        variant="outline"
                        className={`flex flex-col items-center justify-center h-24 p-2 w-full ${
                          dinnerDays[day].status === 'always'
                            ? 'bg-green-100 hover:bg-green-200'
                            : dinnerDays[day].status === 'never'
                            ? 'bg-red-100 hover:bg-red-200'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        onClick={() => {
                          const currentValue = dinnerDays[day].status;
                          const newValue =
                            currentValue === 'always' ? 'takeaway' : currentValue === 'takeaway' ? 'never' : 'always';
                          handleDinnerDayChange(day, newValue);
                        }}
                      >
                        <span className="text-sm font-medium">{day.slice(0, 3)}</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {dinnerDays[day].status === 'always' ? 'Always' : dinnerDays[day].status === 'takeaway' ? 'Take Away' : 'Never'}
                        </span>
                        {dinnerDays[day].status !== 'never' && (
                          <div className="flex items-center mt-2 bg-gray-200 bg-opacity-50 rounded p-1">
                            <Utensils className="text-gray-500 w-4 h-4 mr-1" />
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*\.?[0-9]*"
                              value={dinnerDays[day].portions}
                              onChange={(e) => {
                                e.stopPropagation();
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                handlePortionChange(day, value);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                (e.target as HTMLInputElement).select();
                              }}
                              className="w-12 p-1 text-center bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold text-gray-500"
                            />
                          </div>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full">Save Settings</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default UserSettings;
