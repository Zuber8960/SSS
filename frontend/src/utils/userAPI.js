import Api from '../services/Api';

export const fetchAllUsers       = ()           => Api.get('/user').then(r => r.data.data || []);
export const fetchUserById       = (recId)      => Api.get(`/user/${recId}`).then(r => r.data.data);
export const createUser          = (userData)   => Api.post('/user', userData).then(r => r.data.data);
export const updateUser          = (recId, userData) => Api.put(`/user/${recId}`, userData).then(r => r.data.data);
export const deleteUser          = (recId)      => Api.delete(`/user/${recId}`).then(r => r.data);
