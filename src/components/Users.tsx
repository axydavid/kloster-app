import React, { useState, useEffect, useContext } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import UserIcon from './UserIcon';
import { createClient } from '@supabase/supabase-js';
import { RefreshUsersContext } from './Layout';
import { preserveUserDinnerNames } from '../utils/dinnerUsers';
import { isAdminUser, isDeletedUser, readFunctionError } from '../utils/users';

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
  const refreshUsers = useContext(RefreshUsersContext);
  // State for editing user display names
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editedDisplayName, setEditedDisplayName] = useState<string>('');

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
          setIsAdmin(isAdminUser(allUsers.find((u: UserData) => u.id === user.id)) || isAdminUser(user));
        }
      }
    };
    fetchCurrentUserAndAllUsers();
  }, []);

  const updateUserMetadata = async (userId: string, field: string, value: any) => {
    if (!isAdmin) {
      alert('Only admins can update user data');
      return false;
    }
  
    try {
      // For the database, we need to use PostgreSQL's JSON syntax
      const { data, error } = await supabase.rpc('update_user_metadata', {
        user_id: userId,
        metadata_field: field,
        metadata_value: value  // The raw value will be automatically stringified correctly by the SDK
      });
  
      if (error) throw error;
      
      // Update the local state to reflect the change
      setUsers(users.map(user => 
        user.id === userId ? { 
          ...user, 
          raw_user_meta_data: { 
            ...user.raw_user_meta_data, 
            [field]: value 
          },
          // If we're updating the type field, also update the top-level type property
          ...(field === 'type' ? { type: value } : {})
        } : user
      ));
  
      return true;
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error);
      alert(`Failed to update ${field}. ${error.message || 'Please try again.'}`);
      return false;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) {
      alert('Only admins can delete users');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user? They will be hidden and cannot log in. Their name stays on past dinners, and adding the same email later restores the account.')) {
      try {
        const userToDelete = users.find(user => user.id === userId);
        await preserveUserDinnerNames(
          supabase,
          userId,
          userToDelete?.raw_user_meta_data?.display_name || userToDelete?.email?.split('@')[0],
          userToDelete?.raw_user_meta_data?.iconColor
        );

        const { error } = await supabase.functions.invoke('delete-user-account', {
          body: { userIdToDelete: userId },
        });

        if (error) {
          throw new Error(await readFunctionError(error));
        }

        setUsers(users.map(user =>
          user.id === userId
            ? { ...user, raw_user_meta_data: { ...user.raw_user_meta_data, deleted: true } }
            : user
        ));
        await refreshUsers();
        alert('User deleted. They can be restored by adding the same email again.');
      } catch (error: any) {
        console.error('Error deleting user:', error);
        alert(`Failed to delete user: ${error.message}`);
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
      const existingUser = users.find(user => user.email?.toLowerCase() === newUserEmail.trim().toLowerCase());
      if (existingUser && !isDeletedUser(existingUser)) {
        alert('A user with this email already exists.');
        return;
      }

      if (existingUser && isDeletedUser(existingUser)) {
        const { data, error } = await supabase.functions.invoke('delete-user-account', {
          body: {
            action: 'restore',
            email: newUserEmail.trim(),
            password: newUserPassword,
            displayName: newUserName,
            type: newUserType
          }
        });
        if (error) throw new Error(await readFunctionError(error));

        alert(`User restored: ${newUserName} (${newUserEmail})`);
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserName('');
        setNewUserType('user');
        setUsers(users.map(user =>
          user.id === existingUser.id
            ? {
                ...user,
                type: newUserType,
                raw_user_meta_data: {
                  ...user.raw_user_meta_data,
                  display_name: newUserName,
                  type: newUserType,
                  deleted: false
                }
              }
            : user
        ));
        await refreshUsers();
        return;
      }

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

      if (error) {
        if (/already registered|already exists|user already/i.test(error.message)) {
          const { data: restoreData, error: restoreError } = await supabase.functions.invoke('delete-user-account', {
            body: {
              action: 'restore',
              email: newUserEmail.trim(),
              password: newUserPassword,
              displayName: newUserName,
              type: newUserType
            }
          });
          if (restoreError) throw new Error(await readFunctionError(restoreError, error.message));
          if (restoreData?.user) {
            alert(`User restored: ${newUserName} (${newUserEmail})`);
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserName('');
            setNewUserType('user');
            setUsers([...users.filter(user => user.id !== restoreData.user.id), restoreData.user]);
            await refreshUsers();
            return;
          }
        }
        throw error;
      }

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
        alert(error.message || 'Failed to add user. Please try again.');
      }
    }
  };

  const handleUpdateUserType = async (userId: string, newType: string) => {
    return updateUserMetadata(userId, 'type', newType);
  };

  const handleUpdateDisplayName = async (userId: string, newDisplayName: string) => {
    return updateUserMetadata(userId, 'display_name', newDisplayName);
  };

  const startEditing = (userId: string, currentName: string = '') => {
    setEditingUserId(userId);
    setEditedDisplayName(currentName);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditedDisplayName('');
  };

  const saveDisplayName = (userId: string) => {
    handleUpdateDisplayName(userId, editedDisplayName);
    setEditingUserId(null);
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

      {users.filter(user => !isDeletedUser(user)).map((user: UserData) => (
        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 p-2 border-b">
          <div className="flex items-center mb-2 sm:mb-0">
            <UserIcon user={user} size="small" />
            {editingUserId === user.id ? (
              <div className="ml-2 flex items-center">
                <Input
                  value={editedDisplayName}
                  onChange={(e) => setEditedDisplayName(e.target.value)}
                  className="w-[150px] mr-2"
                />
                <Button
                  size="sm"
                  onClick={() => saveDisplayName(user.id)}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEditing}
                  className="ml-1"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="ml-2">
                <span className="font-medium">{user.raw_user_meta_data?.display_name || 'No display name'}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEditing(user.id, user.raw_user_meta_data?.display_name || '')}
                  className="ml-1 h-6 px-2"
                >
                  Edit
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm text-gray-500">{user.email}</div>
            <Select
              value={isAdminUser(user) ? 'admin' : 'user'}
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
