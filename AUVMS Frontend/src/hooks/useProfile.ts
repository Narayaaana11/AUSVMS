import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '@/types/appointment';
import axios from 'axios';

interface UseProfileOptions {
  isMock?: boolean;
}

interface UseProfileReturn {
  profile: UserProfile | null;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// Mock data for development
const mockProfile: UserProfile = {
  id: '1',
  username: 'john.doe',
  email: 'john.doe@university.edu',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1-555-0123',
  department: 'Computer Science',
  designation: 'Assistant Professor',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  lastLogin: new Date().toISOString(),
  createdAt: '2023-01-15T10:00:00Z',
  updatedAt: new Date().toISOString()
};

export const useProfile = ({ isMock = false }: UseProfileOptions = {}): UseProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (isMock) {
      setIsLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setProfile(mockProfile);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setProfile(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to fetch profile');
    } finally {
      setIsLoading(false);
    }
  }, [isMock]);

  const updateProfile = useCallback(async (profileData: Partial<UserProfile>) => {
    if (isMock) {
      setProfile(prev => prev ? { ...prev, ...profileData, updatedAt: new Date().toISOString() } : null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/profile', profileData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setProfile(response.data.data);
      } else {
        setError(response.data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  }, [isMock]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    if (isMock) {
      // Simulate password change
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/profile/change-password', {
        oldPassword,
        newPassword
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.data.success) {
        setError(response.data.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  }, [isMock]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    updateProfile,
    changePassword,
    isLoading,
    error
  };
};
