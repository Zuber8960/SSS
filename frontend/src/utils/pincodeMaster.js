import Api from '../services/Api';

export const fetchPincodeData = (filters = {}) => Api.get('/pincodeMaster', { params: filters }).then(r => r.data.data || []);
export const fetchPincodeByPincode = (pincode) => Api.get(`/pincodeMaster/byPincode/${encodeURIComponent(pincode)}`).then(r => r.data.data);
export const fetchPincodeStates = () => Api.get('/pincodeMaster/states').then(r => r.data.data || []);
export const fetchPincodeDistricts = (stateName) => Api.get('/pincodeMaster/districts', { params: { state_name: stateName } }).then(r => r.data.data || []);