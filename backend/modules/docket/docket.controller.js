const db = require('../../config/db');

/* ================= GET ================= */

const getAllDockets = async () => {
  return db('sss.sst_docket')
    .select('*');
};

const getDocketById = async ({ docket_no, docket_loc, docket_date }) => {
  return db('sss.sst_docket')
    .where({ docket_no, docket_loc, docket_date })
    .first();
};

const getDocketDetails = async ({ docket_no, docket_loc, docket_date }) => {
  return db('sss.sst_docket_dtl')
    .where({ docket_no, docket_loc, docket_date });
};

/* ================= CREATE ================= */

const createDocket = async (header, trx = db) => {
  return trx('sss.sst_docket').insert({
    ...header,
    aud_date: new Date()
  });
};

const createDocketDetails = async (details, trx = db) => {
  return trx('sss.sst_docket_dtl').insert(details);
};

/* ================= UPDATE ================= */

const updateDocket = async (keys, data, trx = db) => {
  return trx('sss.sst_docket')
    .where(keys)
    .update({
      ...data,
      aud_date: new Date()
    });
};

const deleteDocketDetails = async (keys, trx = db) => {
  return trx('sss.sst_docket_dtl')
    .where(keys)
    .del();
};

/* ================= DELETE ================= */

const deleteDocket = async (keys, trx = db) => {
  // delete child first
  await trx('sss.sst_docket_dtl').where(keys).del();

  return trx('sss.sst_docket')
    .where(keys)
    .del();
};

module.exports = {
  getAllDockets,
  getDocketById,
  getDocketDetails,
  createDocket,
  createDocketDetails,
  updateDocket,
  deleteDocket,
  deleteDocketDetails
};