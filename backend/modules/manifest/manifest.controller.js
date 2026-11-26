const db = require('../../config/db');
const { applyTenant } = require('../../utils/tenantScope');

const assertDocketsOwned = async (trx, details, tenantId) => {
  const nos = [...new Set((details || [])
    .map((row) => String(row.dwb_no || row.docket_no || '').trim())
    .filter(Boolean))];
  if (!nos.length) return;
  if (tenantId == null || tenantId === '') {
    const err = new Error('Tenant is required');
    err.status = 401;
    throw err;
  }
  const query = trx('sss.sst_docket').whereIn('docket_no', nos).where({ record_status: 0 });
  applyTenant(query, 'tenant_id', tenantId);
  const rows = await query.select('docket_no');
  const owned = new Set(rows.map((row) => String(row.docket_no).trim()));
  const missing = nos.find((no) => !owned.has(no));
  if (missing) {
    const err = new Error(`Docket ${missing} is not available`);
    err.status = 404;
    throw err;
  }
};

/* ================= GET ALL MANIFESTS ================= */

const getAllManifests = async (tenant_id) => {
  const query = db('sss.sst_mnf_hdr')
    .select('*')
    .where({ record_status: 0 });
  applyTenant(query, 'tenant_id', tenant_id);
  return query.orderBy('aud_date', 'desc');
};

/* ================= GET MANIFEST BY KEY (composite) ================= */

const getManifestByKey = async ({ mnf_no, mnf_loc, mnf_date }, tenant_id) => {
  const query = db('sss.sst_mnf_hdr')
    .where({ mnf_no, mnf_loc, mnf_date, record_status: 0 });
  applyTenant(query, 'tenant_id', tenant_id);
  return query.first();
};

/* ================= GET MANIFEST BY NO ONLY (for edit/view) ================= */

const getManifestByNo = async (mnf_no, tenant_id) => {
  const query = db('sss.sst_mnf_hdr').where({ mnf_no });
  applyTenant(query, 'tenant_id', tenant_id);
  return query.first();
};

const getManifestByLocation = async (loc, tenant_id) => {
  // Pending unload: destined to this loc and at least one docket not yet in sst_unloading_dtl.
  // Do not hide a manifest just because mnf_arrival_time was set on a partial save.
  const query = db('sss.sst_mnf_hdr as h')
    .where('h.mnf_to_loc', loc)
    .andWhere('h.record_status', 0);
  applyTenant(query, 'h.tenant_id', tenant_id);
  return query
    .whereExists(function () {
      this.select(db.raw('1'))
        .from('sss.sst_mnf_dtl as d')
        .whereRaw('d.mnf_no = h.mnf_no')
        .andWhereRaw('d.mnf_loc = h.mnf_loc')
        .andWhereRaw('d.mnf_date::date = h.mnf_date::date')
        .whereNotExists(function () {
          this.select(db.raw('1'))
            .from('sss.sst_unloading_dtl as u')
            .whereRaw('u.mnf_no = d.mnf_no')
            .andWhereRaw('u.docket_no = d.dwb_no');
        });
    })
    .select('h.*')
    .orderBy('h.mnf_date', 'desc');
};

/* ================= GET MANIFEST DETAILS ================= */

const getManifestDetails = async ({ mnf_no, mnf_loc, mnf_date }) => {
  return db('sss.sst_mnf_dtl as md')
    .leftJoin('sss.sst_docket as d', 'd.docket_no', 'md.dwb_no')
    .leftJoin('sss.ssm_business_partner as cnor', 'd.cnor_id', 'cnor.record_id')
    .leftJoin('sss.ssm_business_partner as cnee', 'd.cnee_id', 'cnee.record_id')
    .where({ 'md.mnf_no': mnf_no, 'md.mnf_loc': mnf_loc, 'md.mnf_date': mnf_date })
    .select(
      'md.mnf_no',
      'md.mnf_loc',
      'md.mnf_date',
      'md.mnf_srno',
      'md.dwb_no',
      'md.dwb_date',
      'md.dwb_loc',
      'md.dwb_to_loc',
      'md.dwb_pkgs',
      'md.dwb_actual_wt',
      'md.dwb_charged_wt',
      'md.mnf_pkgs',
      'd.docket_loc',
      'd.docket_to_loc',
      'd.docket_pickup_town',
      'd.docket_dly_town',
      'd.docket_date',
      'd.docket_pay_type',
      'd.docket_chrg_wt',
      'cnor.bp_name as cnor_name',
      'cnee.bp_name as cnee_name',
    )
    .orderBy('md.mnf_srno');
};

/* ================= GENERATE NEXT MANIFEST NO ================= */

const getNextManifestNo = async () => {
  const result = await db.raw(
    "SELECT COALESCE(MAX(CAST(mnf_no AS INTEGER)), 0) + 1 AS next_no FROM sss.sst_mnf_hdr"
  );
  const nextNo = result.rows?.[0]?.next_no || 1;
  return String(nextNo);
};

/* Apply / reverse dispatched pkgs on the unloading stock at this from-loc */
const applyUnloadingDispatch = async (trx, { fromLoc, details, sign }) => {
  if (!fromLoc || !details?.length) return;

  for (const row of details) {
    const docketNo = row.dwb_no || row.docket_no;
    const pkgs = parseFloat(row.mnf_pkgs || row.dwb_pkgs) || 0;
    const wt = parseFloat(row.dwb_actual_wt) || 0;
    if (!docketNo || pkgs <= 0) continue;

    const unld = await trx('sss.sst_unloading_dtl')
      .where({ docket_no: docketNo })
      .whereRaw("UPPER(TRIM(COALESCE(unld_loc_code, ''))) = UPPER(TRIM(?))", [fromLoc])
      .orderByRaw('arrival_date DESC NULLS LAST')
      .first();

    if (!unld) continue;

    if (sign > 0) {
      const pending = Number(unld.pkgs_received || 0) - Number(unld.desp_pkgs || 0);
      if (pkgs > pending + 0.0001) {
        throw new Error(
          `Docket ${docketNo}: only ${pending} pkg(s) pending at ${fromLoc} to dispatch`
        );
      }
    }

    const q = trx('sss.sst_unloading_dtl').where({ docket_no: docketNo });
    if (unld.record_id != null) q.andWhere({ record_id: unld.record_id });
    else {
      q.whereRaw("UPPER(TRIM(COALESCE(unld_loc_code, ''))) = UPPER(TRIM(?))", [fromLoc]);
      if (unld.mnf_no) q.andWhere({ mnf_no: unld.mnf_no });
    }

    await q.update({
      desp_pkgs: trx.raw('GREATEST(COALESCE(desp_pkgs, 0) + ?, 0)', [sign * pkgs]),
      desp_wt: trx.raw('GREATEST(COALESCE(desp_wt, 0) + ?, 0)', [sign * wt]),
    });
  }
};

const validManifestDetails = (detailsData) =>
  (detailsData || []).filter(
    (row) =>
      row.dwb_no &&
      row.dwb_no.toString().trim() !== '' &&
      row.dwb_date &&
      row.dwb_date.toString().trim() !== '' &&
      row.dwb_loc &&
      row.dwb_loc.toString().trim() !== '' &&
      row.dwb_to_loc &&
      row.dwb_to_loc.toString().trim() !== ''
  );

/* ================= CREATE MANIFEST (header + details in transaction) ================= */

const createManifest = async (headerData, detailsData) => {
  const trx = await db.transaction();
  try {
    // Generate next manifest no
    const nextNo = await getNextManifestNo();
    await assertDocketsOwned(trx, detailsData, headerData.tenant_id);

    // Build header row
    const headerRow = {
      ...headerData,
      tenant_id: headerData.tenant_id || null,
      mnf_no: nextNo,
      aud_date: new Date(),
      ...(headerData.mnf_no ? {} : {}),
    };

    // Insert header
    await trx('sss.sst_mnf_hdr').insert(headerRow);

    // Filter out detail rows with missing required fields (NOT NULL columns)
    const validDetails = detailsData.filter(row =>
      row.dwb_no && row.dwb_no.toString().trim() !== '' &&
      row.dwb_date && row.dwb_date.toString().trim() !== '' &&
      row.dwb_loc && row.dwb_loc.toString().trim() !== '' &&
      row.dwb_to_loc && row.dwb_to_loc.toString().trim() !== ''
    );

    // Build detail rows with composite key
    const detailRows = validDetails.map((row, index) => ({
      company_code: headerData.company_code || null,
      division_code: headerData.division_code || null,
      mnf_no: nextNo,
      mnf_loc: headerData.mnf_loc,
      mnf_date: headerData.mnf_date,
      mnf_srno: index + 1,
      dwb_no: row.dwb_no,
      dwb_date: row.dwb_date,
      dwb_loc: row.dwb_loc,
      dwb_to_loc: row.dwb_to_loc,
      dwb_pkgs: parseFloat(row.dwb_pkgs) || 0,
      dwb_charged_wt: parseFloat(row.dwb_charged_wt) || 0,
      dwb_actual_wt: parseFloat(row.dwb_actual_wt) || 0,
      mnf_pkgs: parseFloat(row.mnf_pkgs) || 0,
      aud_user: headerData.aud_user || '',
      aud_loc: headerData.aud_loc || '',
      aud_date: new Date(),
    }));

    if (detailRows.length > 0) {
      await trx('sss.sst_mnf_dtl').insert(detailRows);
      await applyUnloadingDispatch(trx, {
        fromLoc: headerData.mnf_loc,
        details: detailRows,
        sign: 1,
      });
    }

    await trx.commit();
    return { ...headerRow, mnf_no: nextNo };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

/* The screen sends the manifest date as an ISO timestamp. Read it as an
   India calendar date so 18:30Z does not become the previous day. */
const findManifestHeader = async (no, loc, date, trx = db, tenantId = null) => {
  const raw = String(date || '').trim();
  if (!no || !loc || !raw) return null;
  const daySql = raw.includes('T')
    ? "(timezone('Asia/Kolkata', ?::timestamptz))::date"
    : "?::date";
  const query = trx('sss.sst_mnf_hdr')
    .where({ mnf_no: no, mnf_loc: loc })
    .whereRaw(`mnf_date::date = ${daySql}`, [raw]);
  if (tenantId != null && tenantId !== '') applyTenant(query, 'tenant_id', tenantId);
  return query.first();
};

/* ================= UPDATE MANIFEST ================= */

const updateManifest = async (keys, data, trx = db) => {
  const { mnf_no, mnf_loc, mnf_date, tenant_id, company_code, ...rest } = data || {};
  return trx('sss.sst_mnf_hdr')
    .where(keys)
    .update({
      ...rest,
      aud_date: new Date()
    });
};

/* ================= UPDATE MANIFEST DETAILS (delete all + re-insert) ================= */

const updateManifestDetails = async (keys, detailsData, tenantId) => {
  const trx = await db.transaction();
  try {
    await assertDocketsOwned(trx, detailsData, tenantId);
    const oldDetails = await trx('sss.sst_mnf_dtl').where(keys).select('*');
    await applyUnloadingDispatch(trx, {
      fromLoc: keys.mnf_loc,
      details: oldDetails,
      sign: -1,
    });

    await trx('sss.sst_mnf_dtl')
      .where(keys)
      .del();

    const validDetails = validManifestDetails(detailsData);

    // Insert new details
    const detailRows = validDetails.map((row, index) => ({
      company_code: row.company_code || null,
      division_code: row.division_code || null,
      mnf_no: keys.mnf_no,
      mnf_loc: keys.mnf_loc,
      mnf_date: keys.mnf_date,
      mnf_srno: index + 1,
      dwb_no: row.dwb_no,
      dwb_date: row.dwb_date,
      dwb_loc: row.dwb_loc,
      dwb_to_loc: row.dwb_to_loc,
      dwb_pkgs: parseFloat(row.dwb_pkgs) || 0,
      dwb_charged_wt: parseFloat(row.dwb_charged_wt) || 0,
      dwb_actual_wt: parseFloat(row.dwb_actual_wt) || 0,
      mnf_pkgs: parseFloat(row.mnf_pkgs) || 0,
      aud_user: row.aud_user || '',
      aud_loc: keys.mnf_loc,
      aud_date: new Date(),
    }));

    if (detailRows.length > 0) {
      await trx('sss.sst_mnf_dtl').insert(detailRows);
      await applyUnloadingDispatch(trx, {
        fromLoc: keys.mnf_loc,
        details: detailRows,
        sign: 1,
      });
    }

    await trx.commit();
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

/* ================= GET MANIFESTS BY DOCKET NO (search in mnf_dtl + join with mnf_hdr) ================= */

const getManifestsByDocketNo = async (docketNo, tenant_id) => {
  const query = db('sss.sst_mnf_dtl as dtl')
    .join('sss.sst_mnf_hdr as hdr', function () {
      this.on('dtl.mnf_no', '=', 'hdr.mnf_no')
        .andOn('dtl.mnf_loc', '=', 'hdr.mnf_loc')
        .andOn('dtl.mnf_date', '=', 'hdr.mnf_date');
    })
    .where({ 'dtl.dwb_no': docketNo});
  applyTenant(query, 'hdr.tenant_id', tenant_id);
  return query.select(
      'hdr.*'
    )
    .orderBy('hdr.aud_date', 'desc');
};

/* ================= DELETE MANIFEST (soft) ================= */

const deleteManifest = async (keys, trx = db) => {
  const { tenant_id, ...rest } = keys || {};
  const query = trx('sss.sst_mnf_hdr').where(rest);
  applyTenant(query, 'tenant_id', tenant_id);
  return query.update({ record_status: 1 });
};

/* ================= GET VEHICLE TRACKING DATA ================= */

const getVehicleTrackingData = async (vehicleNo, tenantId) => {
  try {
    const result = await db.raw(`
      SELECT
        A.desp_veh_no,
        CASE WHEN A.desp_doc_type='TV' THEN 'Own'
             WHEN A.desp_doc_type='LH' THEN 'Market'
             WHEN A.desp_doc_type='TC' THEN 'Vendor'
        END AS vehicle_type,
        A.desp_doc_no,
        A.desp_doc_date,
        A.mnf_loc AS from_loc,
        A.mnf_from_town AS from_town,
        A.mnf_to_loc AS to_loc,
        A.mnf_to_town AS to_town,
        B.distance,
        B.transit_time_hrs,
        A.aud_date + (B.transit_time_hrs * INTERVAL '1 hour') AS expected_arrival_time,
        C.latitude,
        C.longitude,
        C.location,
        CASE WHEN sss.fn_distance(D.latitude, D.longitude, C.latitude, C.longitude) * 1.41 > B.distance
             THEN B.distance
             ELSE sss.fn_distance(D.latitude, D.longitude, C.latitude, C.longitude) * 1.41
        END AS distance_covered,
        CASE WHEN (B.distance - sss.fn_distance(D.latitude, D.longitude, C.latitude, C.longitude) * 1.41) > 31
             THEN NOW() + ((CEIL((B.distance - sss.fn_distance(D.latitude, D.longitude, C.latitude, C.longitude) * 1.41) / 20) + 5.5) * INTERVAL '1 hour')
             ELSE NULL
        END AS revised_eta,
        CASE WHEN (B.distance - sss.fn_distance(D.latitude, D.longitude, C.latitude, C.longitude) * 1.41) <= 30 THEN 'Arrived'
             WHEN (NOW() + ((CEIL((B.distance - sss.fn_distance(D.latitude, D.longitude, C.latitude, C.longitude) * 1.41) / 20) + 5.5) * INTERVAL '1 hour')) >
                  (A.aud_date + (B.transit_time_hrs * INTERVAL '1 hour')) THEN 'Delay'
             ELSE 'Early'
        END AS trip_status
      FROM
        sss.sst_mnf_hdr A
        INNER JOIN sss.ssm_distance B ON A.mnf_loc = B.from_loc AND A.mnf_to_loc = B.to_loc AND a.mnf_from_town = b.from_town AND a.mnf_to_town = b.to_town
        INNER JOIN sss.sst_cargo_yaan_gps_data C ON A.desp_veh_no = C.vehicle_no
        INNER JOIN sss.ssm_location D ON A.mnf_loc = D.loc_code
      WHERE
        A.mnf_arrival_time IS NULL
        AND A.desp_veh_no = ?
        AND (A.tenant_id = ? OR (? = 1 AND A.tenant_id IS NULL))
        AND C.id = (SELECT MAX(id) FROM sss.sst_cargo_yaan_gps_data WHERE vehicle_no = A.desp_veh_no)
      LIMIT 1
    `, [vehicleNo, tenantId, tenantId]);

    return result.rows?.[0] || null;
  } catch (err) {
    console.error('Error fetching vehicle tracking data:', err.message);
    return null;
  }
};

module.exports = {
  getAllManifests,
  getManifestByKey,
  getManifestByNo,
  getManifestDetails,
  findManifestHeader,
  getNextManifestNo,
  createManifest,
  updateManifest,
  updateManifestDetails,
  getManifestsByDocketNo,
  deleteManifest,
  getManifestByLocation,
  getVehicleTrackingData,
};
