import { API_URL } from '../services/api';
import { getAuthHeader } from './authService';

/**
 * Get all users
 */
export const fetchEwayBill = async (ewbLists) => {
  try {
    const response = await fetch(`${API_URL}/docket/ewbDetails/${encodeURIComponent(ewbLists)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch Docket');
    }

    const data = await response.json();
    return data?.length ? data.data : data ||  [];
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


export const fetchCharges = async (docketId) => {
  try {
    const response = await fetch(`${API_URL}/docket/${docketId}/charges`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch charges');
    }

    const data = await response.json();
    return data.data || data || [];
  } catch (error) {
    console.error('Fetch charges error:', error);
    throw error;
  }
};


export const createCharge = async (docketId, chargeData) => {
  try {
    const response = await fetch(`${API_URL}/docket/${docketId}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(chargeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create charge');
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Create charge error:', error);
    throw error;
  }
};


export const updateCharge = async (chargeId, chargeData) => {
  try {
    const response = await fetch(`${API_URL}/docket/charges/${chargeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(chargeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update charge');
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Update charge error:', error);
    throw error;
  }
};


export const deleteCharge = async (chargeId) => {
  try {
    const response = await fetch(`${API_URL}/docket/charges/${chargeId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete charge');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Delete charge error:', error);
    throw error;
  }
};