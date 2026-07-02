import Api from '../services/Api';

export const fetchAllCompanies = ()                          => Api.get('/companyMaster').then(r => r.data.data || []);
export const createCompany     = (companyData)               => Api.post('/companyMaster', companyData).then(r => r.data.data);
export const updateCompany     = (companyCode, companyData)  => Api.put(`/companyMaster/${companyCode}`, companyData).then(r => r.data.data);
export const deleteCompany     = (companyCode)               => Api.delete(`/companyMaster/${companyCode}`).then(r => r.data);
