const db = require('../../config/db');
const bcrypt = require('bcrypt');


module.exports = {


    async getAllLocationData(recId) {
        return db('sss.ssm_location')
            .select('*');
    }
};