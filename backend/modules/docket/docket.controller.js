const db = require('../../config/db');
const axios = require('axios');


/* ================= GET ================= */

const getEwaybillDetails = async (ewbNo=process.env.ewbNo) => {
  try {
    // email=connectwithlogipod%40gmail.com&username=cargoyaan1_API_HAR&password=CYsss%40221274
    const authGet = await axios.get(
      'https://api.whitebooks.in/ewaybillapi/v1.03/ewayapi/getewaybill',
      {
        params: {
          email: process.env.email,
          username: process.env.username,
          password: process.env.password,
        },
        headers: {
          accept: '*/*',
          ip_address: process.env.IP_ADDRESS,
          client_id: process.env.client_id,
          client_secret: process.env.client_secret,
          gstin: process.env.GSTIN,
        },
      }
    );

    console.log(authGet);

    const response = await axios.get(
      'https://api.whitebooks.in/ewaybillapi/v1.03/ewayapi/getewaybill',
      {
        params: {
          email: process.env.email,
          ewbNo: ewbNo,
        },
        headers: {
          accept: '*/*',
          ip_address: process.env.IP_ADDRESS,
          client_id: process.env.client_id,
          client_secret: process.env.client_secret,
          gstin: process.env.GSTIN, // 06AADCT6685Q1ZG
        },
      }
    );

  //    const response = await axios.get(
  //   `https://api.whitebooks.in/ewayapi/GetEwayBill`,
  //   {
  //     params: { ewbNo },
  //     headers: {
  //       'client-id': 'EWBP42c05bd4-f7a7-456d-b5b2-b043c79d7b74' || process.env.CLIENT_ID,
  //       'client-secret': 'EWBPba531f90-bae9-420e-9a5b-7f4a87e73f03' || process.env.CLIENT_SECRET,
  //       'gstin': '06AADCT6685Q1ZG' || process.env.GSTIN,
  //       'authtoken': process.env.AUTH_TOKEN
  //     }
  //   }
  // );

   console.log(response);

    return response.data;
  } catch (error) {
    console.error(
      'E-Way Bill Fetch Error:',
      error.response?.data || error.message
    );
    throw error;
  }
};



const getListEwayDetails = async (ewbLists) => {
  try {
    // const authGet = await axios.get(
    //   'https://api.whitebooks.in/ewaybillapi/v1.03/ewayapi/getewaybill',
    //   {
    //     params: {
    //       email: process.env.email,
    //       username: process.env.username,
    //       password: process.env.password,
    //     },
    //     headers: {
    //       accept: '*/*',
    //       ip_address: process.env.IP_ADDRESS,
    //       client_id: process.env.client_id,
    //       client_secret: process.env.client_secret,
    //       gstin: process.env.GSTIN,
    //     },
    //   }
    // );

    // console.log(authGet);
    console.log(ewbLists);
    const responses = await Promise.all(
      ewbLists.map((ewbNo) =>
        axios.get(
          'https://api.whitebooks.in/ewaybillapi/v1.03/ewayapi/getewaybill',
          {
            params: {
              email: process.env.email,
              ewbNo,
            },
            headers: {
              accept: '*/*',
              ip_address: process.env.IP_ADDRESS,
              client_id: process.env.client_id,
              client_secret: process.env.client_secret,
              gstin: process.env.GSTIN,
            },
          }
        )
      )
    );

    const result = responses.map(obj => obj.data);

    return result;


  //    const response = await axios.get(
  //   `https://api.whitebooks.in/ewayapi/GetEwayBill`,
  //   {
  //     params: { ewbNo },
  //     headers: {
  //       'client-id': 'EWBP42c05bd4-f7a7-456d-b5b2-b043c79d7b74' || process.env.CLIENT_ID,
  //       'client-secret': 'EWBPba531f90-bae9-420e-9a5b-7f4a87e73f03' || process.env.CLIENT_SECRET,
  //       'gstin': '06AADCT6685Q1ZG' || process.env.GSTIN,
  //       'authtoken': process.env.AUTH_TOKEN
  //     }
  //   }
  // );

  } catch (error) {
    console.error(
      'E-Way Bill Fetch Error:',
      error.response?.data || error.message
    );
    throw error;
  }
};

const getAllDockets = async () => {
  return db('sss.sst_docket')
    .select('*')
    .where({record_status : 0});
};

const getDocketById = async ({ docket_no, docket_loc, docket_date }) => {
  return db('sss.sst_docket')
    .where({ docket_no, docket_loc, docket_date, record_status: 0 })
    .first();
};

const getDocketDetails = async ({ docket_no, docket_loc, docket_date }) => {
  return db('sss.sst_docket_dtl')
    .where({ docket_no, docket_loc, docket_date, record_status: 0 });
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
    .update({record_status: 1})
};

/* ================= CHARGES ================= */

const getChargesByDocketId = async (docketNo) => {
  return db('sss.sst_docket_charges')
    .where({ docket_no: docketNo, record_status: 0 })
    .select('*');
};

const createCharge = async (docketNo, chargeData, trx = db) => {
  return trx('sss.sst_docket_charges')
    .insert({
      docket_no: docketNo,
      charge_code: chargeData.charge_code,
      user_code: chargeData.user_code,
      charge_amt: chargeData.charge_amt,
      aud_date: new Date()
    })
    .returning('*');
};

const updateCharge = async (chargeId, chargeData, trx = db) => {
  return trx('sss.sst_docket_charges')
    .where({ id: chargeId })
    .update({
      charge_code: chargeData.charge_code,
      user_code: chargeData.user_code,
      charge_amt: chargeData.charge_amt,
      aud_date: new Date()
    })
    .returning('*');
};

const deleteCharge = async (chargeId, trx = db) => {
  return trx('sss.sst_docket_charges')
    .where({ id: chargeId })
    .update({ record_status: 1 });
};

/* ================= EWAY BILL DB OPERATIONS ================= */

const getEwayBillFromDB = async (ewbNumbers) => {
  return db('sss.sst_docket_ewb')
    .whereIn('ewb_no', ewbNumbers)
    .select('*');
};

const saveEwayBillToDB = async (ewbDataArray) => {
  const rows = ewbDataArray.map(item => {
    const data = item.data || item;
    return {
      ewb_no: String(data.ewbNo || ''),
      ewb_date: data.ewayBillDate ? data.ewayBillDate.split(' ')[0] : null,
      ewb_valid_upto: data.validUpto ? data.validUpto.split(' ')[0] : null,
      invoice_no: data.docNo || '',
      invoice_date: data.docDate || null,
      cnor_name: data.fromTrdName || '',
      cnor_address: (data.fromAddr1 || '') + ' ' + (data.fromAddr2 || ''),
      cnor_gstin: data.fromGstin || '',
      cnor_pincode: data.fromPincode || null,
      cnee_name: data.toTrdName || '',
      cnee_address: (data.toAddr1 || '') + ' ' + (data.toAddr2 || ''),
      cnee_gstin: data.toGstin || '',
      cnee_pincode: data.toPincode || null,
      taxble_value: data.taxableAmount || data.totalValue || 0,
      cgst: data.cgstValue || 0,
      sgst: data.sgstValue || 0,
      igst: data.igstValue || 0,
      cess: data.cessValue || 0,
      invoice_total: data.totInvValue || 0,
      product_name: data.itemList?.map(i => i.productName || i.productDesc).filter(Boolean).join(', ') || '',
      hsn_code: data.itemList?.map(i => i.hsnCode).filter(Boolean).join(', ') || '',
      quantity: data.itemList?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0,
      aud_date: new Date()
    };
  });

  return db('sss.sst_docket_ewb')
    .insert(rows)
    .returning('*');
};

module.exports = {
  getAllDockets,
  getDocketById,
  getDocketDetails,
  createDocket,
  createDocketDetails,
  updateDocket,
  deleteDocket,
  deleteDocketDetails,
  getEwaybillDetails,
  getListEwayDetails,
  getChargesByDocketId,
  createCharge,
  updateCharge,
  deleteCharge,
  getEwayBillFromDB,
  saveEwayBillToDB
};
