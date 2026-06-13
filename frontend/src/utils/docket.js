import { API_URL } from '../services/api';
import { getAuthHeader } from './authService';

/**
 * Get all users
 */
export const fetchEwayBill = async () => {
  try {
    const response = await fetch(`${API_URL}/docket/ewayBill`, {
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


export const fetchDocketById = async (recId) => {
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

