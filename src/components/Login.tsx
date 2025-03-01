import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { ReactComponent as Logo } from '../icons/logo.svg';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const [logoColor, setLogoColor] = useState('#000000'); // Default color for the logo

  useEffect(() => {
    const checkSession = async () => {
      const {  { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkSession();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let result;
      if (isSignUp) {
        // Include display_name in user metadata when signing up
        result = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              display_name: displayName
            }
          }
        });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
      
      if (result.error) throw result.error;
      
      if (isSignUp) {
        alert('Sign up successful! Please check your email to confirm your account.');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Auth error:', error);
        alert(error.message);
      } else {
        console.error('Unknown error:', error);
        alert('An unknown error occurred');
      }
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
            <CardTitle>{isSignUp ? 'Sign Up' : 'Login'}</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth}>
              <div className="grid w-full items-center gap-4">
                {isSignUp && (
                  <div className="flex flex-col space-y-1.5">
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                  </div>
                )}
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
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <input type="submit" style={{ display: 'none' }} />
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Switch to Login' : 'Switch to Sign Up'}
            </Button>
            <Button onClick={handleAuth}>{isSignUp ? 'Sign Up' : 'Login'}</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
