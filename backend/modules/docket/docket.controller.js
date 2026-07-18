const moment = require('moment');
const db = require('../../config/db');
const axios = require('axios');
const ewb = require('../../config/ewb');

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

const getAllDockets = async (tenant_id) => {
  const query = db('sss.sst_docket').select('*').where({ record_status: 0 });
  if (tenant_id) query.andWhere({ tenant_id });
  return query;
};

const getDocketById = async ({ docket_no, docket_loc, docket_date }, tenant_id) => {
  const query = db('sss.sst_docket').where({ docket_no, docket_loc, docket_date, record_status: 0 });
  if (tenant_id) query.andWhere({ tenant_id });
  return query.first();
};

const getDocketByRecId = async (rec_id, tenant_id) => {
  const query = db('sss.sst_docket as d')
    .leftJoin('sss.sst_docket_ewb as e', 'd.docket_no', 'e.docket_no')
    .where({ 'd.rec_id': rec_id, 'd.record_status': 0 })
    .select(
      'd.*', 'e.ewb_no',
      'e.cnor_name', 'e.cnor_address', 'e.cnor_pincode', 'e.cnor_gstin',
      'e.cnee_name', 'e.cnee_address', 'e.cnee_pincode', 'e.cnee_gstin'
    );
  if (tenant_id) query.andWhere({ 'd.tenant_id': tenant_id });
  return query.first();
};

const getDocketByNo = async (docket_no, tenant_id) => {
  const query = db('sss.sst_docket as d')
    .leftJoin('sss.sst_docket_ewb as e', 'd.docket_no', 'e.docket_no')
    .where({ 'd.docket_no': docket_no, 'd.record_status': 0 })
    .select(
      'd.*', 'e.ewb_no',
      'e.cnor_name', 'e.cnor_address', 'e.cnor_pincode', 'e.cnor_gstin',
      'e.cnee_name', 'e.cnee_address', 'e.cnee_pincode', 'e.cnee_gstin'
    );
  if (tenant_id) query.andWhere({ 'd.tenant_id': tenant_id });
  return query.first();
};

const getDocketDetails = async ({ docket_no, docket_loc, docket_date }, tenant_id) => {
  const query = db('sss.sst_docket_dtl').where({ docket_no, docket_loc, docket_date, record_status: 0 });
  if (tenant_id) query.andWhere({ tenant_id });
  return query;
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

const createDocket = async (body, trx = db) => {
  let query = trx('sss.sst_docket').insert({
    ...sanitizeDocketData({ ...body }),
    aud_date: new Date()
  }).returning(['docket_no', 'docket_loc', 'docket_date', 'division_code']);
  return query;
};

const createDocketDetails = async (details, trx = db) => {
  return trx('sss.sst_docket_dtl').insert(details);
};

/* ================= UPDATE ================= */

const updateDocket = async (keys, data, trx = db) => {
  return trx('sss.sst_docket')
    .where(keys)
    .update({
      ...sanitizeDocketData(data),
      aud_date: new Date()
    });
};

const updateDocketByRecId = async (rec_id, data, trx = db) => {
  // Fetch current keys before updating
  const current = await trx('sss.sst_docket')
    .where({ rec_id })
    .select('docket_no', 'docket_loc', 'docket_date')
    .first();

  if (!current) return null;

  await trx('sss.sst_docket')
    .where({ rec_id })
    .update({
      ...sanitizeDocketData(data),
      aud_date: new Date(),
      aud_user: data.aud_user
    });

  // Update shared fields in dtl rows (no delete)
  const dtlUpdate = {};
  if (data.docket_loc !== undefined)    dtlUpdate.docket_loc    = data.docket_loc;
  if (data.docket_date !== undefined)   dtlUpdate.docket_date   = data.docket_date;
  // if (data.company_code !== undefined)  dtlUpdate.company_code  = data.company_code;
  if (data.division_code !== undefined) dtlUpdate.division_code = data.division_code;
  if (data.docket_no !== undefined) dtlUpdate.docket_no = data.docket_no;

  if (Object.keys(dtlUpdate).length > 0) {
    await trx('sss.sst_docket_dtl')
      .where({
        docket_no:   current.docket_no,
        docket_loc:  current.docket_loc,
        docket_date: current.docket_date
      })
      .update({ ...dtlUpdate, aud_date: new Date(), aud_user : data.aud_user});
  }
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

const getChargesByDocketId = async (docketNo, tenant_id) => {
  const query = db('sss.sst_docket_charges').where({ docket_no: docketNo, record_status: 0 }).select('*');
  if (tenant_id) query.andWhere({ tenant_id });
  return query;
};

const createCharge = async (docketNo, chargeData, trx = db) => {
  return trx('sss.sst_docket_charges')
    .insert({
      docket_no: docketNo,
      charge_code: chargeData.charge_code,
      user_code: chargeData.user_code,
      charge_amt: chargeData.charge_amt,
      tenant_id: chargeData.tenant_id || null,
      aud_date: new Date()
    })
    .returning('*');
};

const updateCharge = async (chargeId, chargeData, trx = db, tenant_id) => {
  const query = trx('sss.sst_docket_charges').where({ rec_id: chargeId });
  if (tenant_id) query.andWhere({ tenant_id });
  return query.update({
    charge_code: chargeData.charge_code,
    user_code: chargeData.user_code,
    charge_amt: chargeData.charge_amt,
    aud_date: new Date()
  }).returning('*');
};

const deleteCharge = async (chargeId, trx = db, tenant_id) => {
  const query = trx('sss.sst_docket_charges').where({ rec_id: chargeId });
  if (tenant_id) query.andWhere({ tenant_id });
  return query.update({ record_status: 1 });
};

/* ================= EWAY BILL DB OPERATIONS ================= */

const updateEwayBillByRecId = async (rec_id, data, trx = db) => {
  const ewb_date = data.ewb_date ? moment(data.ewb_date, ['YYYY-MM-DD', 'DD/MM/YYYY'], true).format('YYYY-MM-DD') : undefined;
  const ewb_valid_upto = data.ewb_valid ? moment(data.ewb_valid, ['YYYY-MM-DD', 'DD/MM/YYYY'], true).format('YYYY-MM-DD') : undefined;
  const invoice_date = data.inv_date ? moment(data.inv_date, ['YYYY-MM-DD', 'DD/MM/YYYY'], true).format('YYYY-MM-DD') : undefined;
  const update = {
    ...(data.ewb_no   !== undefined && { ewb_no: String(data.ewb_no) }),
    ...(ewb_date      !== undefined && { ewb_date }),
    ...(ewb_valid_upto !== undefined && { ewb_valid_upto }),
    ...(invoice_date  !== undefined && { invoice_date }),
    ...(data.inv_no   !== undefined && { invoice_no: data.inv_no }),
    aud_date: new Date(),
  };
  const { tenant_id } = data;
  delete update.rec_id;
  const operation = await trx('sss.sst_docket_ewb').where({ ewb_no: update.ewb_no, tenant_id }).first() ? 'put' : 'post';
  if (operation === 'post') {
    return trx('sss.sst_docket_ewb').where({ ewb_no: update.ewb_no, tenant_id }).insert(update);
  } else {
    return trx('sss.sst_docket_ewb').where({ ewb_no: update.ewb_no, tenant_id }).update(update);
  }
};

const getEwayBillFromDB = async (ewbNumbers, tenant_id) => {
  let apiCalls = false;
  const query = db('sss.sst_ewb_hdr').whereIn('EWB_NO', ewbNumbers.map(String)).select('*');
  if (tenant_id) query.andWhere({ tenant_id });
  let results = await query;
  if (!results.length) {
    // If not found in DB, fetch from API
    apiCalls = true;
    let apiResults = await getListEwayDetails(ewbNumbers);
    if (apiResults.find(d => d.data)) {
      results = apiResults.map(({data}) => ({
        ...data,
        ewb_date: data.ewb_date ? moment(data.ewb_date, ['YYYY-MM-DD', 'DD/MM/YYYY'], true).format('YYYY-MM-DD') : null,
        ewb_valid_upto: data.ewb_valid_upto ? moment(data.ewb_valid_upto, ['YYYY-MM-DD', 'DD/MM/YYYY'], true).format('YYYY-MM-DD') : null,
        invoice_date: data.inv_date ? 
          moment(data.inv_date, ['YYYY-MM-DD', 'DD/MM/YYYY', 'DD/MM/YYYY hh:mm:ss A'], true).format('YYYY-MM-DD') : 
          data.invoice_date ? moment(data.invoice_date, ['YYYY-MM-DD', 'DD/MM/YYYY', 'DD/MM/YYYY hh:mm:ss A'], true).format('YYYY-MM-DD') : null   
      }));
    } else {
      apiResults = ewb.ewb_dummy_data;
      results = apiResults
      .map(({data}) => data)
      .filter(d => d.ewbNo && ewbNumbers.includes(d.ewbNo))
      .map((ewbRes) => ({
          ...ewbRes,
          ewb_date: ewbRes.ewb_date ? moment(ewbRes.ewb_date, ['YYYY-MM-DD', 'DD/MM/YYYY'], true).format('YYYY-MM-DD') : null,
          ewb_valid_upto: ewbRes.ewb_valid_upto ? moment(ewbRes.ewb_valid_upto, ['YYYY-MM-DD', 'DD/MM/YYYY'], true).format('YYYY-MM-DD') : null,
          invoice_date: ewbRes.inv_date ? moment(ewbRes.inv_date, ['YYYY-MM-DD', 'DD/MM/YYYY'], true).format('YYYY-MM-DD') : null,
        }));
    }
    if (results.length) {
      if (apiCalls) {
        const ewbResult = await saveDataEwb(results, tenant_id);
        results = ewbResult;
      } else {
        // const ewbDbResult = await saveEwayBillToDB(results, tenant_id);
        // console.log('EWB saved to DB:', ewbDbResult);
        // results = ewbDbResult;
      }
    } else {
      console.log('No EWB data found from API for:', ewbNumbers);
    }
  };
  return {  results, apiCalls };
}

const saveDataEwb = async (apiResResult, tenant_id) => {
  const ewbHdrRows = [];
  const ewbDtlRows = [];
  const ewbItemRows = [];
  const ewbVehicleRows = [];

  for (const item of apiResResult) {
    const data = item.data || item;

    const ewbDate = moment(data.ewayBillDate, ['DD/MM/YYYY hh:mm:ss A', 'DD/MM/YYYY', 'YYYY-MM-DD'], true);
    const validUpto = moment(data.validUpto, ['DD/MM/YYYY hh:mm:ss A', 'DD/MM/YYYY', 'YYYY-MM-DD'], true);
    const invDate = moment(data.docDate, ['DD/MM/YYYY', 'YYYY-MM-DD'], true);

    const ewbNoStr = String(data.ewbNo || '');
    const docketNo = data.docNo || '';
    const ewbDateStr = ewbDate.isValid() ? ewbDate.format('YYYY-MM-DD') : null;
    const invDateStr = invDate.isValid() ? invDate.format('YYYY-MM-DD') : null;

    const vehicle = data.VehiclListDetails?.[0] || {};
    const vehUpdDate = vehicle.enteredDate
      ? moment(vehicle.enteredDate, ['DD/MM/YYYY hh:mm:ss A', 'DD/MM/YYYY'], true)
      : null;

    const totalQty = data.itemList?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
    const productNames = data.itemList?.map(i => i.productDesc || i.productName).filter(Boolean).join(', ') || '';
    const hsnCode = data.itemList?.[0]?.hsnCode || null;

    ewbHdrRows.push({
      company_code: data.company_code || null,
      division_code: data.division_code || null,
      LOC_GSTIN: data.fromGstin || '',
      EWB_NO: ewbNoStr,
      EWB_DATE: ewbDateStr,
      EWB_VALID_UPTO: validUpto.isValid() ? validUpto.format('YYYY-MM-DD') : null,
      EWB_GENERATED_BY: data.userGstin || null,
      INV_NO: docketNo,
      INV_DATE: invDateStr,
      REJ_STATUS: data.rejectStatus || null,
      AUD_DATE: new Date(),
      BASE_VALUE: data.totalValue || 0,
      SGST_VALUE: data.sgstValue || 0,
      CGST_VALUE: data.cgstValue || 0,
      IGST_VALUE: data.igstValue || 0,
      TOTAL_INV_VALUE: data.totInvValue || 0,
      aud_date: new Date(),
      tenant_id
    });

    ewbDtlRows.push({
      company_code: data.company_code || null,
      division_code: data.division_code || null,
      EWB_NO: ewbNoStr,
      EWB_DATE: ewbDateStr,
      CNOR_GSTIN: data.fromGstin || null,
      FROM_PLACE: data.fromPlace || null,
      FROM_STATE: String(data.fromStateCode || ''),
      FROM_PINCODE: String(data.fromPincode || ''),
      CNEE_GSTIN: data.toGstin || null,
      TO_PLACE: data.toPlace || null,
      TO_STATE: String(data.toStateCode || ''),
      TO_PINCODE: String(data.toPincode || ''),
      INV_NO: docketNo,
      INV_DATE: invDateStr,
      INV_VALUE: data.totInvValue || 0,
      TRANS_GSTIN: data.transporterId || null,
      ACT_DIST: data.actualDist || null,
      ITEM_HSN_CODE: hsnCode,
      ITEM_QTY: totalQty,
      VEHICLE_NO: vehicle.vehicleNo || null,
      VEHICLE_UPD_DATE: vehUpdDate?.isValid() ? vehUpdDate.format('YYYY-MM-DD') : null,
      UPD_MODE: vehicle.updMode || null,
      TAX_VALUE: data.totalValue || 0,
      IGST: data.igstValue || 0,
      SGST: data.sgstValue || 0,
      CGST: data.cgstValue || 0,
      CESS: data.cessValue || 0,
      PRODUCT_NAME: productNames,
      FROM_ADDRESS: ((data.fromAddr1 || '') + ' ' + (data.fromAddr2 || '')).trim(),
      FROM_CUST_NAME: data.fromTrdName || null,
      TO_ADDRESS: ((data.toAddr1 || '') + ' ' + (data.toAddr2 || '')).trim(),
      TO_CUST_NAME: data.toTrdName || null,
      AUD_DATE: new Date(),
      tenant_id
    });

    for (const itemEntry of (data.itemList || [])) {
      ewbItemRows.push({
        iten_no: itemEntry.itemNo || null,
        product_id: itemEntry.productId || null,
        product_name: itemEntry.productName || null,
        product_desc: itemEntry.productDesc || null,
        hsn_code: itemEntry.hsnCode || null,
        quantity: itemEntry.quantity || null,
        qty_unit: itemEntry.qtyUnit || null,
        cgst_rate: itemEntry.cgstRate || null,
        sgst_rate: itemEntry.sgstRate || null,
        igst_rate: itemEntry.igstRate || null,
        cess_rate: itemEntry.cessRate || null,
        cess_non_advol: itemEntry.cessNonAdvol || null,
        taxableamount: itemEntry.taxableAmount || null,
        docket_no: docketNo,
        ewb_no: ewbNoStr,
        tenant_id
      });
    }

    for (const veh of (data.VehiclListDetails || [])) {
      ewbVehicleRows.push({
        vehicle_no: veh.vehicleNo || null,
        upd_mode: veh.updMode || null,
        from_place: veh.fromPlace || null,
        from_state: veh.fromState || null,
        tripsht_no: veh.tripshtNo || null,
        user_gstin_transin: veh.userGSTINTransin || null,
        entered_date: veh.enteredDate || null,
        trans_mode: veh.transMode || null,
        trans_doc_no: veh.transDocNo || null,
        trans_doc_date: veh.transDocDate || null,
        groupno: veh.groupNo || null,
        docket_no: docketNo,
        ewb_no: ewbNoStr,
        tenant_id
      });
    }
  }

  const [ewbResult] = await Promise.all([
    db('sss.sst_ewb_hdr')
      .insert(ewbHdrRows)
      .onConflict(['LOC_GSTIN', 'EWB_NO', 'EWB_DATE'])
      .merge()
      .returning('*'),
    db('sss.sst_ewb_dtl')
      .insert(ewbDtlRows),
    db('sss.ewb_items')
      .insert(ewbItemRows)
      .onConflict(['docket_no', 'ewb_no', 'iten_no'])
      .merge(),
    db('sss.ewb_vehicles')
      .insert(ewbVehicleRows)
      .onConflict(['docket_no', 'ewb_no'])
      .merge(),
  ]);

  return ewbResult;
};

const saveEwayBillToDB = async (ewbDataArray, tenant_id) => {
  const rows = ewbDataArray.map(item => {
    const data = item.data || item; // DD/MM/YYYY hh:mm:ss A
    
    const ewb_date = moment(data.ewb_date || data.ewayBillDate , ['YYYY-MM-DD', 'DD/MM/YYYY', 'DD/MM/YYYY hh:mm:ss A'], true).format('YYYY-MM-DD') || null;
    const ewb_valid_upto = moment(data.ewb_valid ||  data.validUpto, ['YYYY-MM-DD', 'DD/MM/YYYY', 'DD/MM/YYYY hh:mm:ss A'], true).format('YYYY-MM-DD') || null;
    const invoice_date = data.inv_date ? 
      moment(data.inv_date, ['YYYY-MM-DD', 'DD/MM/YYYY', 'DD/MM/YYYY hh:mm:ss A'], true).format('YYYY-MM-DD') : 
      data.invoice_date ? moment(data.invoice_date, ['YYYY-MM-DD', 'DD/MM/YYYY', 'DD/MM/YYYY hh:mm:ss A'], true).format('YYYY-MM-DD') : null;
    return {
      ewb_no: String(data.ewbNo || ''),
      ewb_date,
      ewb_valid_upto,
      invoice_no: data.inv_no,
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
      tenant_id: tenant_id || null,
      aud_date: new Date()
    };
  });

  let query = db('sss.sst_docket_ewb')
    .insert(rows)
    .returning('*');
  const ewbResult = await query;

  // const docketRows = ewbDataArray.map(item => {
  //   const data = item.data || item;
  //   const docket_date = data.docDate ? moment(data.docDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;
  //   const totalQty = data.itemList?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
  //   const goodsDesc = data.itemList?.map(i => i.productDesc || i.productName).filter(Boolean).join(', ') || '';
  //   const hsnCode = data.itemList?.[0]?.hsnCode ? String(data.itemList[0].hsnCode) : '';

  //   return {
  //     docket_loc: (data.fromPlace || '').toUpperCase(),
  //     docket_no: data.docNo || '',
  //     docket_date,
  //     docket_to_loc: (data.toPlace || '').toUpperCase(),
  //     docket_cnor_name: data.fromTrdName || '',
  //     docket_cnee_name: data.toTrdName || '',
  //     docket_dly_town: data.toPlace || '',
  //     docket_act_wt: totalQty,
  //     docket_chrg_wt: totalQty,
  //     docket_inv_value: data.totalValue || 0,
  //     docket_tot_amt: data.totInvValue || 0,
  //     docket_goods_desc: goodsDesc,
  //     hsn_code: hsnCode,
  //     tenant_id: tenant_id || null,
  //     aud_date: new Date(),
  //     record_status: 0
  //   };
  // });

  // await db('sss.sst_docket')
  //   .insert(docketRows)
  //   .onConflict(['docket_no', 'docket_loc', 'docket_date'])
  //   .ignore();

  return ewbResult;
};

module.exports = {
  getAllDockets,
  getDocketById,
  getDocketByNo,
  getDocketByRecId,
  getDocketDetails,
  createDocket,
  createDocketDetails,
  updateDocket,
  updateDocketByRecId,
  deleteDocket,
  deleteDocketDetails,
  getEwaybillDetails,
  getListEwayDetails,
  getChargesByDocketId,
  createCharge,
  updateCharge,
  deleteCharge,
  getEwayBillFromDB,
  saveEwayBillToDB,
  updateEwayBillByRecId,
};
