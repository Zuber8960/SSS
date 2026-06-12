import { API_URL } from '../services/api';
import { getAuthHeader } from './authService';

/**
 * Get all companies
 */
export const fetchAllCompanies = async () => {
  try {
    const response = await fetch(`${API_URL}/companyMaster`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch companies');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Fetch companies error:', error);
    throw error;
  }
};

/**
 * Create company
 */
export const createCompany = async (companyData) => {
  try {
    const response = await fetch(`${API_URL}/companyMaster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(companyData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create company');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Create company error:', error);
    throw error;
  }
};

/**
 * Update company
 */
export const updateCompany = async (companyCode, companyData) => {
  try {
    const response = await fetch(`${API_URL}/companyMaster/${companyCode}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(companyData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update company');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Update company error:', error);
    throw error;
  }
};

/**
 * Delete company
 */
export const deleteCompany = async (companyCode) => {
  try {
    const response = await fetch(`${API_URL}/companyMaster/${companyCode}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete company');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete company error:', error);
    throw error;
  }
};
