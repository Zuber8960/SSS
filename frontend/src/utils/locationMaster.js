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

export const saveLocations = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/locationMaster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save locations');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Fetch locations error:', error);
    throw error;
  }
};

/**
 * Update location
 */
export const updateLocation = async (locCode, payload) => {
  try {
    const response = await fetch(`${API_URL}/locationMaster/${encodeURIComponent(locCode)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update location');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Update location error:', error);
    throw error;
  }
};

/**
 * Delete location
 */
export const deleteLocation = async (locCode) => {
  try {
    const response = await fetch(`${API_URL}/locationMaster/${encodeURIComponent(locCode)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete location');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete location error:', error);
    throw error;
  }
};