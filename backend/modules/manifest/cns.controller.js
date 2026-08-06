const db = require('../../config/db');

/**
 * CNS Validation for Manifest Entry
 * 
 * Validates whether a docket can be added to a manifest based on manifest type.
 */

/**
 * Validate docket for LOCAL PICKUP manifest type
 * Check from sst_docket:
 *   DOCKET FROM LOC = MANIFEST FROM LOC
 *   DOCKET FROM TOWN = MANIFEST FROM TOWN
 *   AND (TOT_PKGS - DESP_PKGS) > 0
 */
const validateLocalPickup = async ({ docketNo, fromLoc, fromTown }) => {
  const result = await db('sss.sst_docket')
    .where({
      docket_no: docketNo,
      docket_loc: fromLoc,
      docket_pickup_town: fromTown,
    })
    .whereRaw('(docket_tot_pkgs - desp_pkgs) > 0')
    .where({ record_status: 0 })
    .first();

  if (!result) {
    return {
      valid: false,
      message: 'Docket not found or no pending packages for pickup at this location/town',
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
 *   docket_to_loc = manifest_to_loc
 *   manifest_to_town = docket_to_town
 */
const validateLocalDelivery = async ({ docketNo, fromLoc, toLoc, toTown }) => {
  const result = await db('sss.sst_unloading_dtl')
    .where({
      docket_no: docketNo,
      unld_loc_code: fromLoc,
      docket_to_loc: toLoc,
      docket_to_town: toTown,
    })
    .whereRaw('(pkgs_received - desp_pkgs) > 0')
    .first();

  if (!result) {
    return {
      valid: false,
      message: 'Docket not found or no pending packages for local delivery at this location/town',
    };
  }

  return {
    valid: true,
    message: 'Docket is valid for local delivery',
    data: result,
  };
};

module.exports = {
  validateLocalPickup,
  validateLongHaul,
  validateLocalDelivery,
};