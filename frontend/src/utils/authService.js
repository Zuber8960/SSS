import { API_URL } from '../services/api';

const TOKEN_KEY = 'authToken';

/**
 * Login user with credentials
 * @param {string} userId - User ID
 * @param {string} password - Password
 * @returns {Promise} - Response from backend
 */
export const loginUser = async (userId, password) => {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                userId,
                password
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Login failed');
        }

        const data = await response.json();

        // Store token in localStorage
        if (data.token) {
            localStorage.setItem(TOKEN_KEY, data.token);
        }

        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get stored authentication token
 * @returns {string|null} - JWT token or null
 */
export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

/**
 * Logout user - Remove token from storage
 */
export const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if token exists
 */
export const isAuthenticated = () => {
    return !!localStorage.getItem(TOKEN_KEY);
};

/**
 * Get authorization header with token
 * @returns {object} - Authorization header object
 */
export const getAuthHeader = () => {
    const token = getToken();
    if (token) {
        return {
            'Authorization': `Bearer ${token}`
        };
    }
    return {};
};
