import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { ReactComponent as Logo } from '../icons/logo.svg';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [logoColor, setLogoColor] = useState('#000000');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !newPassword) {
      setError("Email and new password are required.");
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('reset-password', {
        body: { email, newPassword },
      });

      if (invokeError) {
        let errorMessage = invokeError.message;
        try {
          const errorBody = await invokeError.context.json();
          if (errorBody.error) {
            errorMessage = errorBody.error;
          }
        } catch (e) {
          // Ignore parsing error, use default message
        }
        setError(errorMessage);
        return;
      }
      
      if (data?.message) {
        setMessage(data.message);
      } else {
        setMessage('Password has been reset successfully. You can now log in with your new password.');
      }

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      console.error('Password reset error:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="mb-8 text-center">
        <div className="flex flex-col items-center">
          <Logo className="h-16 w-auto mb-2" style={{ fill: logoColor }} />
          <span className="text-3xl font-bold" style={{ color: logoColor }}>KlosterApp</span>
        </div>
      </div>
      <div className="w-full max-w-md p-4 space-y-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Enter your email and a new password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <input type="submit" style={{ display: 'none' }} />
            </form>
            {message && <p className="text-green-500 mt-4">{message}</p>}
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button onClick={handleResetPassword} className="w-full">Reset Password</Button>
            <Link to="/login" className="text-sm text-blue-500 hover:underline">Back to Login</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
