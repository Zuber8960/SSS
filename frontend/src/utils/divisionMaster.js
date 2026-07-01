import { API_URL } from '../services/api';
import { getAuthHeader } from './authService';

/**
 * Get all divisions
 */
export const fetchAllDivisions = async () => {
  try {
    const response = await fetch(`${API_URL}/divisionMaster`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch divisions');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Fetch divisions error:', error);
    throw error;
  }
};

export const saveDivision = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/divisionMaster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save division');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Save division error:', error);
    throw error;
  }
};

/**
 * Update division
 */
export const updateDivision = async (recId, payload) => {
  try {
    const response = await fetch(`${API_URL}/divisionMaster/${encodeURIComponent(recId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update division');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Update division error:', error);
    throw error;
  }
};

/**
 * Delete division
 */
export const deleteDivision = async (recId) => {
  try {
    const response = await fetch(`${API_URL}/divisionMaster/${encodeURIComponent(recId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete division');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete division error:', error);
    throw error;
  }
};