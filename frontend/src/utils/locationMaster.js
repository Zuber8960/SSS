import { API_URL } from '../services/api';
import { getAuthHeader } from './authService';

/**
 * Get all locations
 */
export const fetchAllLocations = async () => {
  try {
    const response = await fetch(`${API_URL}/locationMaster`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch locations');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Fetch locations error:', error);
    throw error;
  }
};