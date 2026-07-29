import Api from '../services/Api';

let _cache = null;

export const fetchStatesAndCities = async () => {
    if (_cache) return _cache;
    const data = await Api.get('/stateCity').then(r => r.data.data || { states: [], cities: [] });
    _cache = data;
    return data;
};

export const clearStateCityCache = () => { _cache = null; };
