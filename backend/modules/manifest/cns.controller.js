const db = require('../../config/db');

/**
 * CNS Validation for Manifest Entry
 * 
 * Validates whether a docket can be added to a manifest based on manifest type.
 */

const excludeDocketsWithManifestType = (qb, docketNoExpr, mnfType) =>
  qb.whereNotExists(function () {
    this.select(db.raw('1'))
      .from({ md: 'sss.sst_mnf_dtl' })
      .innerJoin({ mh: 'sss.sst_mnf_hdr' }, function () {
        this.on('mh.mnf_no', '=', 'md.mnf_no')
          .andOn('mh.mnf_loc', '=', 'md.mnf_loc')
          .andOn('mh.mnf_date', '=', 'md.mnf_date');
      })
      .whereRaw(
        `UPPER(TRIM(COALESCE(md.dwb_no::text, ''))) = UPPER(TRIM(COALESCE(${docketNoExpr}, '')))`
      )
      .whereRaw('LOWER(TRIM(COALESCE(mh.mnf_type, \'\'))) = ?', [String(mnfType).toLowerCase()])
      .andWhere(function () {
        this.where('mh.record_status', 0).orWhereNull('mh.record_status');
      });
  });

const LOCAL_PICKUP_COLUMNS = [
  'd.docket_no',
  'd.docket_date',
  'd.docket_loc',
  'd.docket_to_loc',
  'd.docket_pickup_town',
  'd.docket_dly_town',
  'd.docket_tot_pkgs',
  'd.desp_pkgs',
  'd.docket_act_wt',
  'd.docket_chrg_wt',
  'd.docket_pay_type',
  'cnor.bp_name as cnor_name',
  'cnee.bp_name as cnee_name',
];

const localPickupBaseQuery = ({ fromLoc, fromTown }) => {
  const q = db('sss.sst_docket as d')
    .leftJoin('sss.ssm_business_partner as cnor', 'd.cnor_id', 'cnor.record_id')
    .leftJoin('sss.ssm_business_partner as cnee', 'd.cnee_id', 'cnee.record_id')
    .whereRaw("UPPER(TRIM(COALESCE(d.docket_loc, ''))) = UPPER(TRIM(?))", [fromLoc])
    .whereRaw("UPPER(TRIM(COALESCE(d.docket_pickup_town, ''))) = UPPER(TRIM(?))", [fromTown])
    .whereRaw('(COALESCE(d.docket_tot_pkgs, 0) - COALESCE(d.desp_pkgs, 0)) > 0')
    .where({ 'd.record_status': 0 })
    .select(LOCAL_PICKUP_COLUMNS);
  return excludeDocketsWithManifestType(q, 'd.docket_no::text', 'lp');
};

/**
 * Validate docket for LOCAL PICKUP manifest type
 * Check from sst_docket:
 *   DOCKET FROM LOC = MANIFEST FROM LOC
 *   DOCKET FROM TOWN = MANIFEST FROM TOWN
 *   AND (TOT_PKGS - DESP_PKGS) > 0
 *   AND no Local Pickup manifest already exists for the docket
 */
const validateLocalPickup = async ({ docketNo, fromLoc, fromTown }) => {
  const result = await localPickupBaseQuery({ fromLoc, fromTown })
    .andWhere('d.docket_no', docketNo)
    .first();

  if (!result) {
    return {
      valid: false,
      message: 'Docket not found, already on a Local Pickup manifest, or no pending packages at this location/town',
    };
  }

  return {
    valid: true,
    message: 'Docket is valid for local pickup',
    data: result,
  };
};

/**
 * Validate docket for LONG HAUL manifest type
 * a) Check from sst_docket:
 *      DOCKET FROM LOC = MANIFEST FROM LOC
 *      DOCKET FROM TOWN = MANIFEST FROM TOWN
 *      AND (TOT_PKGS - DESP_PKGS) > 0
 * b) Check from sst_unloading_dtl:
 *      unld_loc_code = MANIFEST FROM LOC
 *      and (pkgs_received - desp_pkgs) > 0
 */
const validateLongHaul = async ({ docketNo, fromLoc, fromTown }) => {
  // Check sst_docket first
  const docket = await db('sss.sst_docket')
    .where({
      docket_no: docketNo,
      docket_loc: fromLoc,
      docket_pickup_town: fromTown,
    })
    .whereRaw('(docket_tot_pkgs - desp_pkgs) > 0')
    .where({ record_status: 0 })
    .first();

  if (!docket) {
    return {
      valid: false,
      message: 'Docket not found or no pending packages for long haul at this location/town',
    };
  }

  // Check sst_unloading_dtl for available packages at the unloading location
  // const unloading = await db('sss.sst_unloading_dtl')
  //   .where({
  //     docket_no: docketNo,
  //     unld_loc_code: fromLoc,
  //   })
  //   .whereRaw('(pkgs_received - desp_pkgs) > 0')
  //   .first();

  // if (!unloading) {
  //   return {
  //     valid: false,
  //     message: 'No unloaded packages available for long haul at this location',
  //   };
  // }

  return {
    valid: true,
    message: 'Docket is valid for long haul',
    data: {
      docket,
      // unloading,
    },
  };
};

/**
 * Validate docket for LOCAL DELIVERY manifest type
 * Check from sst_unloading_dtl:
 *   unld_loc_code = MANIFEST FROM LOC
 *   and (pkgs_received - desp_pkgs) > 0
 *   docket_to_loc = MANIFEST TO LOC
 *   docket town (sst_docket.docket_dly_town) = MANIFEST TO TOWN
 *   AND no Local Delivery manifest already exists for the docket
 */
const LOCAL_DELIVERY_COLUMNS = [
  'ud.docket_no',
  'ud.docket_date',
  'ud.docket_from_loc',
  'ud.unld_loc_code',
  'ud.docket_to_loc',
  'ud.pkgs_received',
  'ud.desp_pkgs',
  'ud.docket_act_wt',
  'ud.docket_chrg_wt',
  'cnor.bp_name as cnor_name',
  'cnee.bp_name as cnee_name',
  'd.docket_pickup_town',
  'd.docket_dly_town',
  'd.docket_pay_type',
  'd.docket_loc',
];

const localDeliveryBaseQuery = ({ fromLoc, toLoc, toTown }) => {
  const q = db('sss.sst_unloading_dtl as ud')
    .leftJoin('sss.sst_docket as d', 'd.docket_no', 'ud.docket_no')
    .leftJoin('sss.ssm_business_partner as cnor', 'd.cnor_id', 'cnor.record_id')
    .leftJoin('sss.ssm_business_partner as cnee', 'd.cnee_id', 'cnee.record_id')
    .whereRaw("UPPER(TRIM(COALESCE(ud.unld_loc_code, ''))) = UPPER(TRIM(?))", [fromLoc])
    .whereRaw("UPPER(TRIM(COALESCE(ud.docket_to_loc, d.docket_to_loc, ''))) = UPPER(TRIM(?))", [toLoc])
    .whereRaw("UPPER(TRIM(COALESCE(d.docket_dly_town, ''))) = UPPER(TRIM(?))", [toTown])
    .whereRaw('(COALESCE(ud.pkgs_received, 0) - COALESCE(ud.desp_pkgs, 0)) > 0')
    .select(LOCAL_DELIVERY_COLUMNS);
  return excludeDocketsWithManifestType(q, 'ud.docket_no::text', 'ld');
};

const validateLocalDelivery = async ({ docketNo, fromLoc, toLoc, toTown }) => {
  const result = await localDeliveryBaseQuery({ fromLoc, toLoc, toTown })
    .andWhere('ud.docket_no', docketNo)
    .first();

  if (!result) {
    return {
      valid: false,
      message: 'Docket not found, already on a Local Delivery manifest, or no pending packages at this location/town',
    };
  }

  return {
    valid: true,
    message: 'Docket is valid for local delivery',
    data: result,
  };
};

/* Dockets at From Loc / From Town that do not already have a Local Pickup manifest */
const listLocalPickupDockets = async ({ fromLoc, fromTown, manifestDate }) => {
  const query = localPickupBaseQuery({ fromLoc, fromTown })
    .orderBy('d.docket_date')
    .orderBy('d.docket_no');
  if (manifestDate) {
    query.andWhereRaw('d.docket_date <= ?', [String(manifestDate).slice(0, 10)]);
  }
  const rows = await query;
  const seen = new Set();
  return rows.filter((r) => {
    if (!r.docket_no || seen.has(r.docket_no)) return false;
    seen.add(r.docket_no);
    return true;
  });
};

/* Dockets waiting at From Loc for local delivery to To Loc / To Town */
const listLocalDeliveryDockets = async ({ fromLoc, toLoc, toTown, manifestDate }) => {
  const query = localDeliveryBaseQuery({ fromLoc, toLoc, toTown })
    .orderBy('ud.docket_date')
    .orderBy('ud.docket_no');
  if (manifestDate) {
    query.andWhereRaw('ud.docket_date <= ?', [String(manifestDate).slice(0, 10)]);
  }
  const rows = await query;
  const seen = new Set();
  return rows.filter((r) => {
    if (!r.docket_no || seen.has(r.docket_no)) return false;
    seen.add(r.docket_no);
    return true;
  });
};

module.exports = {
  validateLocalPickup,
  validateLongHaul,
  validateLocalDelivery,
  listLocalPickupDockets,
  listLocalDeliveryDockets,
};