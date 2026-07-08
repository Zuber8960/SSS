const moment = require('moment');
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

const getDocketByNo = async (docket_no) => {
  return db('sss.sst_docket as d')
    .leftJoin('sss.sst_docket_ewb as e', 'd.docket_no', 'e.docket_no')
    .where({ 'd.docket_no': docket_no, 'd.record_status': 0 })
    .select(
      'd.*',
      'e.cnor_name', 'e.cnor_address', 'e.cnor_pincode', 'e.cnor_gstin',
      'e.cnee_name', 'e.cnee_address', 'e.cnee_pincode', 'e.cnee_gstin'
    )
    .first();
};

const getDocketDetails = async ({ docket_no, docket_loc, docket_date }) => {
  return db('sss.sst_docket_dtl')
    .where({ docket_no, docket_loc, docket_date, record_status: 0 });
};

/* ================= HELPERS ================= */

const NUMERIC_DOCKET_FIELDS = [
  'docket_act_wt', 'docket_chrg_wt', 'docket_pay_type',
  'docket_rate', 'docket_tot_amt', 'docket_inv_value',
  'docket_insurance_amt', 'docket_po_amt', 'docket_transit_days',
  'docket_crtns', 'docket_bndls', 'docket_bags',
  'docket_loose', 'docket_other', 'docket_tot_pkgs'
];

const sanitizeDocketData = (data) => {
  const sanitized = { ...data };
  for (const field of NUMERIC_DOCKET_FIELDS) {
    if (field in sanitized) {
      const val = sanitized[field];
      if (val === '' || val === undefined || val === null) {
        sanitized[field] = null;
      } else {
        const num = Number(val);
        sanitized[field] = isNaN(num) ? null : num;
      }
    }
  }
  if ('docket_act_wt' in sanitized && sanitized.docket_act_wt === null) sanitized.docket_act_wt = 0;
  if ('docket_chrg_wt' in sanitized && sanitized.docket_chrg_wt === null) sanitized.docket_chrg_wt = 0;
  return sanitized;
};

/* ================= CREATE ================= */

const createDocket = async (header, trx = db) => {
  return trx('sss.sst_docket').insert({
    ...sanitizeDocketData(header),
    aud_date: new Date()
  });
};

const createDocketDetails = async (details, trx = db) => {
  return trx('sss.sst_docket_dtl').insert(details);
};

/* ================= UPDATE ================= */

const updateDocket = async (keys, data, trx = db) => {
  const query = trx('sss.sst_docket')
    .where(keys)
    .update({
      ...sanitizeDocketData(data),
      aud_date: new Date()
    });
  return query;
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
  const query = trx('sss.sst_docket_charges')
    .insert({
      docket_no: docketNo,
      charge_code: chargeData.charge_code,
      user_code: chargeData.user_code,
      charge_amt: chargeData.charge_amt,
      aud_date: new Date()
    })
    .returning('*');
  return query;
};

const updateCharge = async (chargeId, chargeData, trx = db) => {
  const query = trx('sss.sst_docket_charges')
    .where({ rec_id: chargeId })
    .update({
      charge_code: chargeData.charge_code,
      user_code: chargeData.user_code,
      charge_amt: chargeData.charge_amt,
      aud_date: new Date()
    })
    .returning('*');
  return query;
};

const deleteCharge = async (chargeId, trx = db) => {
  const query = trx('sss.sst_docket_charges')
    .where({ rec_id: chargeId })
    .update({ record_status: 1 });
  return query;
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
    const ewb_date = moment(data.ewayBillDate, 'DD/MM/YYYY').format('YYYY-MM-DD') || null;
    const ewb_valid_upto = data.validUpto ? moment(data.validUpto, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;
    const invoice_date = data.docDate ? moment(data.docDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;
    return {
      ewb_no: String(data.ewbNo || ''),
      ewb_date,
      ewb_valid_upto,
      invoice_no: data.docNo || '',
      docket_no: data.docNo || '',
      invoice_date,
      cnor_name: data.fromTrdName || '',
      cnor_address: (data.fromAddr1 || '') + ' ' + (data.fromAddr2 || ''),
      cnor_gstin: data.fromGstin || '',
      cnor_pincode: data.fromPincode || null,
      cnee_name: data.toTrdName || '',
      cnee_address: (data.toAddr1 || '') + ' ' + (data.toAddr2 || ''),
      cnee_gstin: data.toGstin || '',
      cnee_pincode: data.toPincode || null,
      // taxble_value: data.taxableAmount || data.totalValue || 0,
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

  

  const ewbResult = await db('sss.sst_docket_ewb')
    .insert(rows)
    .returning('*');

  const docketRows = ewbDataArray.map(item => {
    const data = item.data || item;
    const docket_date = data.docDate ? moment(data.docDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;
    const totalQty = data.itemList?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
    const goodsDesc = data.itemList?.map(i => i.productDesc || i.productName).filter(Boolean).join(', ') || '';
    const hsnCode = data.itemList?.[0]?.hsnCode ? String(data.itemList[0].hsnCode) : '';

    return {
      docket_loc: (data.fromPlace || '').toUpperCase(),
      docket_no: data.docNo || '',
      docket_date,
      docket_to_loc: (data.toPlace || '').toUpperCase(),
      docket_cnor_name: data.fromTrdName || '',
      docket_cnee_name: data.toTrdName || '',
      docket_dly_town: data.toPlace || '',
      docket_act_wt: totalQty,
      docket_chrg_wt: totalQty,
      docket_inv_value: data.totalValue || 0,
      docket_tot_amt: data.totInvValue || 0,
      docket_goods_desc: goodsDesc,
      hsn_code: hsnCode,
      aud_date: new Date(),
      record_status: 0
    };
  });

  await db('sss.sst_docket')
    .insert(docketRows)
    .onConflict(['docket_no', 'docket_loc', 'docket_date'])
    .ignore();

  return ewbResult;
};

module.exports = {
  getAllDockets,
  getDocketById,
  getDocketByNo,
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
