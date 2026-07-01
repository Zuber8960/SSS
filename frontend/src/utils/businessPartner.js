import { API_URL } from '../services/api';
import { getAuthHeader } from './authService';

/**
 * Get all business partners
 */
export const fetchAllBusinessPartners = async () => {
  try {
    const response = await fetch(`${API_URL}/businessPartner`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch business partners');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Fetch business partners error:', error);
    throw error;
  }
};

export const saveBusinessPartner = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/businessPartner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save business partner');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Save business partner error:', error);
    throw error;
  }
};

/**
 * Update business partner
 */
export const updateBusinessPartner = async (recId, payload) => {
  try {
    const response = await fetch(`${API_URL}/businessPartner/${encodeURIComponent(recId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update business partner');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Update business partner error:', error);
    throw error;
  }
};

/**
 * Delete business partner
 */
export const deleteBusinessPartner = async (recId) => {
  try {
    const response = await fetch(`${API_URL}/businessPartner/${encodeURIComponent(recId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete business partner');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete business partner error:', error);
    throw error;
  }
};