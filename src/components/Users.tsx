import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import UserIcon from './UserIcon';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL!, process.env.REACT_APP_SUPABASE_ANON_KEY!);

interface UserData {
  id: string;
  email: string;
  type: string;
  raw_user_meta_data: {
    display_name?: string;
    iconColor?: string;
    [key: string]: any;
  };
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserType, setNewUserType] = useState('user');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchCurrentUserAndAllUsers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: allUsers, error: allUsersError } = await supabase.rpc('get_all_users');
        if (allUsersError) {
          console.error('Error fetching all users:', allUsersError);
        } else if (allUsers) {
          setUsers(allUsers);
          setIsAdmin(allUsers.find((u: UserData) => u.id === user.id)?.type === 'admin');
        }
      }
    };
    fetchCurrentUserAndAllUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) {
      alert('Only admins can delete users');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const { error } = await supabase.rpc('delete_user', { user_id: userId });

        if (error) throw error;
        setUsers(users.filter(user => user.id !== userId));
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. Please try again.');
      }
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only admins can add users');
      return;
    }

    if (!newUserEmail || !newUserPassword || !newUserName) {
      alert('Please provide email, password, and name.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: { 
            type: newUserType,
            display_name: newUserName
          }
        }
      });

      if (error) throw error;

      alert(`User added successfully: ${newUserName} (${newUserEmail})`);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserType('user');
      
      if (data.user) {
        const newUser: UserData = {
          id: data.user.id,
          email: data.user.email!,
          type: newUserType,
          raw_user_meta_data: { display_name: newUserName }
        };
        setUsers([...users, newUser]);
      }
    } catch (error: any) {
      console.error('Error adding user:', error);
      if (error.message.includes('Password should be at least 6 characters')) {
        alert('Password should be at least 6 characters long.');
      } else {
        alert('Failed to add user. Please try again.');
      }
    }
  };

  const handleUpdateUserType = async (userId: string, newType: string) => {
    if (!isAdmin) {
      alert('Only admins can update user types');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('update_user_type', {
        user_id: userId,
        new_type: newType
      });

      if (error) throw error;
      
      // Update the local state to reflect the change
      setUsers(users.map(user => 
        user.id === userId ? { ...user, type: newType } : user
      ));
    } catch (error: any) {
      console.error('Error updating user type:', error);
      alert(`Failed to update user type. ${error.message || 'Please try again.'}`);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAddUser} className="flex items-end space-x-2 mb-4">
        <div className="flex-1">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="type">Type</Label>
          <Select value={newUserType} onValueChange={setNewUserType}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">Add User</Button>
      </form>
      
      {users.map((user: UserData) => (
        <div key={user.id} className="flex items-center justify-between mb-4 p-2 border-b">
          <div className="flex items-center">
            <UserIcon user={user} size="small" />
            <span className="ml-2">{user.raw_user_meta_data?.display_name || user.email}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Select 
              value={user.type} 
              onValueChange={(newType) => handleUpdateUserType(user.id, newType)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteUser(user.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Users;
