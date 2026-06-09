import { API_URL } from '../services/api';
import { getAuthHeader } from './authService';

/**
 * Get all users
 */
export const fetchAllUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch users');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Fetch users error:', error);
    throw error;
  }
};

/**
 * Get user by rec_id
 */
export const fetchUserById = async (recId) => {
  try {
    const response = await fetch(`${API_URL}/user/${recId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch user');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Fetch user error:', error);
    throw error;
  }
};

/**
 * Create new user
 */
export const createUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create user');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
};

/**
 * Update user
 */
export const updateUser = async (recId, userData) => {
  try {
    const response = await fetch(`${API_URL}/user/${recId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update user');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Update user error:', error);
    throw error;
  }
};

/**
 * Delete user
 */
export const deleteUser = async (recId) => {
  try {
    const response = await fetch(`${API_URL}/user/${recId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete user');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete user error:', error);
    throw error;
  }
};
