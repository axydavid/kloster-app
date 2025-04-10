import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Toast, { ToastType } from './Toast';
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Utensils, Lock } from 'lucide-react';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

interface DinnerDays {
  [key: string]: {
    status: 'never' | 'always' | 'default' | 'takeaway';
    portions: string;
  };
}

interface AdminSettings {
  suspendedWeekdays: number[];
}

interface AdminSettingsDB {
  suspended_weekdays: number[];
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
  const [portions, setPortions] = useState('1');
  const [weeklyPortions, setWeeklyPortions] = useState<{ [key: string]: string }>({});
  const [isColorPopoverOpen, setIsColorPopoverOpen] = useState(false);
  const [joinDinners, setJoinDinners] = useState(false);
  const [dinnerDays, setDinnerDays] = useState<DinnerDays>({
    Monday: { status: 'never', portions: '1' },
    Tuesday: { status: 'never', portions: '1' },
    Wednesday: { status: 'never', portions: '1' },
    Thursday: { status: 'never', portions: '1' },
    Friday: { status: 'never', portions: '1' },
    Saturday: { status: 'never', portions: '1' },
    Sunday: { status: 'never', portions: '1' },
  });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({ suspendedWeekdays: [] });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    setDinnerDays(prevDays => {
      const newDays = { ...prevDays };
      weekdays.forEach((day, index) => {
        const isSuspended = adminSettings.suspendedWeekdays.includes(index + 1);
        if (isSuspended) {
          newDays[day].status = 'never';
        }
      });
      return newDays;
    });
  }, [adminSettings, weekdays]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setDisplayName(user.user_metadata.display_name || user.email || '');
        setIconColor(user.user_metadata.iconColor || '#007bff');
        setPortions(user.user_metadata.portions || '1');
        setJoinDinners(user.user_metadata.joinDinners || false);
        const userDinnerDays = user.user_metadata.dinnerDays || {};
        const defaultDinnerDays = {
          Monday: { status: 'never', portions: '1' },
          Tuesday: { status: 'never', portions: '1' },
          Wednesday: { status: 'never', portions: '1' },
          Thursday: { status: 'never', portions: '1' },
          Friday: { status: 'never', portions: '1' },
          Saturday: { status: 'never', portions: '1' },
          Sunday: { status: 'never', portions: '1' },
        };

        setDinnerDays(Object.keys(defaultDinnerDays).reduce((acc, day) => {
          acc[day] = {
            status: userDinnerDays[day]?.status || 'never',
            portions: userDinnerDays[day]?.portions || '1'
          };
          return acc;
        }, {} as DinnerDays));
      }

      // Fetch admin settings
      const { data: adminData, error: adminError } = await supabase
        .from('admin_settings')
        .select('suspended_weekdays')
        .single();

      if (adminError) {
        console.error('Error fetching admin settings:', adminError);
      } else {
        setAdminSettings({ suspendedWeekdays: (adminData as AdminSettingsDB).suspended_weekdays });
      }
    };
    fetchSettings();
  }, []);

  const handleJoinDinnersChange = (checked: boolean) => {
    setJoinDinners(checked);
    if (!checked) {
      setDinnerDays(prevDays => {
        const newDays = { ...prevDays };
        weekdays.forEach(day => {
          newDays[day] = { ...newDays[day], status: 'never' };
        });
        return newDays;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called');

    setIsSubmitting(true);
    setToast({ message: 'Saving settings...', type: 'loading' });

    // Update dinnerDays statuses for suspended days
    const updatedDinnerDays = { ...dinnerDays };
    weekdays.forEach((day, index) => {
      const isSuspended = adminSettings.suspendedWeekdays.includes(index + 1);
      if (isSuspended) {
        updatedDinnerDays[day].status = 'never';
      }
    });

    const formattedDinnerDays = Object.entries(updatedDinnerDays).reduce((acc, [day, value]) => {
      acc[day] = {
        status: value.status,
        portions: value.portions
      };
      return acc;
    }, {} as { [key: string]: { status: string; portions: string } });

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          iconColor,
          portions: portions.trim(),
          joinDinners,
          dinnerDays: formattedDinnerDays
        }
      });

      if (error) throw error;

      // Update admin_settings table
      if (joinDinners) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: adminSettings, error: adminError } = await supabase
            .from('admin_settings')
            .select('dinner')
            .single();

          if (adminError) throw adminError;

          const currentDinner = adminSettings.dinner || [];
          if (!currentDinner.includes(user.id)) {
            const { error: updateError } = await supabase
              .from('admin_settings')
              .update({ dinner: [...currentDinner, user.id] })
              .eq('id', 1);

            if (updateError) throw updateError;
          }

          // Update dinner_days for the next 28 days
          await updateDinnerDaysForNextMonth(user.id, formattedDinnerDays);
        }
      } else {
        // Remove user from dinner array if they've opted out
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: adminSettings, error: adminError } = await supabase
            .from('admin_settings')
            .select('dinner')
            .single();

          if (adminError) throw adminError;

          const currentDinner = adminSettings.dinner || [];
          const updatedDinner = currentDinner.filter((id: string) => id !== user.id);
          const { error: updateError } = await supabase
            .from('admin_settings')
            .update({ dinner: updatedDinner })
            .eq('id', 1);

          if (updateError) throw updateError;

          // Remove user from all future dinner_days
          await removeDinnerDaysForUser(user.id);
        }
      }

      setToast({ message: 'Settings saved successfully!', type: 'success' });
      setTimeout(() => setToast(null), 5000);
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      setToast({ message: 'Error saving settings. Please try again.', type: 'error' });
      setTimeout(() => setToast(null), 5000);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDinnerDaysForNextMonth = async (userId: string, dinnerDays: { [key: string]: { status: string; portions: string } }) => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 28 * 24 * 60 * 60 * 1000);

    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
      const daySettings = dinnerDays[dayOfWeek];

      const { data, error } = await supabase
        .from('dinner_days')
        .select('attendants')
        .eq('date', d.toISOString().split('T')[0])
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching dinner day:', error);
        continue;
      }

      let attendants = data?.attendants || [];
      const existingAttendantIndex = attendants.findIndex((a: { id: string }) => a.id === userId);

      if (daySettings.status === 'always' || daySettings.status === 'takeaway') {
        if (existingAttendantIndex !== -1) {
          attendants[existingAttendantIndex] = {
            ...attendants[existingAttendantIndex],
            portions: Number(daySettings.portions),
            isTakeAway: daySettings.status === 'takeaway',
            isAutomaticallySet: true
          };
        } else {
          attendants.push({
            id: userId,
            portions: Number(daySettings.portions),
            isTakeAway: daySettings.status === 'takeaway',
            isAutomaticallySet: true
          });
        }
      } else if (existingAttendantIndex !== -1 && attendants[existingAttendantIndex].isAutomaticallySet) {
        // Remove the user if they were automatically set but the new setting is 'never'
        attendants.splice(existingAttendantIndex, 1);
      }

      const { error: upsertError } = await supabase
        .from('dinner_days')
        .upsert({ date: d.toISOString().split('T')[0], attendants });

      if (upsertError) {
        console.error('Error updating dinner day:', upsertError);
      }
    }
  };

  const removeDinnerDaysForUser = async (userId: string) => {
    const startDate = new Date();
    const { data: dinnerDays, error } = await supabase
      .from('dinner_days')
      .select('date, attendants')
      .gte('date', startDate.toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching dinner days:', error);
      return;
    }

    for (const day of dinnerDays) {
      const updatedAttendants = day.attendants.filter((a: { id: string }) => a.id !== userId);
      const { error: updateError } = await supabase
        .from('dinner_days')
        .update({ attendants: updatedAttendants })
        .eq('date', day.date);

      if (updateError) {
        console.error('Error updating dinner day:', updateError);
      }
    }
  };

  const handleDinnerDayChange = useCallback((day: string, status: 'always' | 'never' | 'default' | 'takeaway', isSuspended: boolean) => {
    setDinnerDays(prev => {
      const newDays = { ...prev };
      newDays[day] = { ...newDays[day], status: isSuspended ? 'never' : status };
      return newDays;
    });
  }, []);

  const handlePortionChange = useCallback((day: string, portions: string) => {
    setDinnerDays(prev => {
      const newDays = { ...prev };
      newDays[day] = { ...newDays[day], portions };
      return newDays;
    });
  }, []);

  // Remove the useEffect hook that was causing automatic saves

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(e);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ message: 'Passwords do not match.', type: 'error' });
      setTimeout(() => setToast(null), 5000);
      return;
    }
    if (newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters long.', type: 'error' });
      setTimeout(() => setToast(null), 5000);
      return;
    }

    setIsPasswordSubmitting(true);
    setToast({ message: 'Updating password...', type: 'loading' });

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setToast({ message: 'Password updated successfully!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setToast(null), 5000);
    } catch (error) {
      console.error('Error updating password:', error);
      setToast({ message: 'Error updating password. Please try again.', type: 'error' });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsPasswordSubmitting(false);
    }
  };


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>User Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Keep existing form content here, remove toast from inside */}
            <div className="flex flex-wrap -mx-2">
              {/* Display Name and Icon Color inputs */}
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
              {/* Default Portions input */}
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

            {/* Join Dinners section */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div
                  className="bg-secondary p-4 rounded-lg shadow-sm cursor-pointer select-none flex-1"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setJoinDinners(!joinDinners);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="joinDinners" className="text-lg font-semibold cursor-pointer"
                      onMouseDown={(e) => e.preventDefault()}>Join Dinners</Label>
                    <Checkbox
                      id="joinDinners"
                      checked={joinDinners}
                      onCheckedChange={(checked) => handleJoinDinnersChange(checked as boolean)}
                      onClick={(e) => e.preventDefault()}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Enable to join community dinners</p>
                  {joinDinners && (
                    <div className="mt-4">
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-2 mt-4">Auto Response</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                          {weekdays.map((day, index) => {
                            const isSuspended = adminSettings.suspendedWeekdays.includes(index + 1);
                            return (
                              <div key={day} className="flex flex-col items-center" onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={`flex flex-col items-center justify-center h-24 p-2 w-full ${isSuspended
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : dinnerDays[day].status === 'always'
                                      ? 'bg-green-100 hover:bg-green-200'
                                      : dinnerDays[day].status === 'never'
                                        ? 'bg-red-100 hover:bg-red-200'
                                        : dinnerDays[day].status === 'takeaway'
                                          ? 'bg-yellow-100 hover:bg-yellow-200'
                                          : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                  onMouseDown={(e) => {
                                    // Only respond to left clicks (button === 0)
                                    if (e.button === 0 && !isSuspended) {
                                      const currentValue = dinnerDays[day].status;
                                      const newValue =
                                        currentValue === 'always' ? 'takeaway' : currentValue === 'takeaway' ? 'never' : 'always';
                                      handleDinnerDayChange(day, newValue, isSuspended);
                                    }
                                  }}
                                  disabled={isSuspended}
                                >
                                  <span className="text-sm font-medium">{day.slice(0, 3)}</span>
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {isSuspended
                                      ? 'Suspended'
                                      : dinnerDays[day].status === 'always'
                                        ? 'Always'
                                        : dinnerDays[day].status === 'takeaway'
                                          ? 'Take Away'
                                          : 'Never'}
                                  </span>
                                  {!isSuspended && dinnerDays[day].status !== 'never' && (
                                    <div
                                      className="flex items-center mt-2 bg-gray-200 bg-opacity-50 rounded p-1"
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                    >
                                      <Utensils className="text-gray-500 w-4 h-4 mr-1 shrink-0" />
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
                                        onMouseDown={(e) => {
                                          e.stopPropagation(); // Prevent triggering the parent button
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault(); // Prevent form submission
                                            e.stopPropagation();
                                          }
                                        }}
                                        className="w-full p-1 text-center bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold text-gray-500"
                                      />
                                    </div>
                                  )}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* New Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full"
                placeholder="Enter new password (min 6 chars)"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full"
                placeholder="Confirm new password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPasswordSubmitting}>
              {isPasswordSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSettings;
