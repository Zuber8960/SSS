import Api from '../services/Api';

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
export const validateLocalPickup = (docketNo, fromLoc, fromTown) =>
  Api.get(`/cns/validate/local-pickup`, {
    params: {
      docketNo,
      fromLoc,
      fromTown,
    },
  }).then((r) => r.data.data || r.data);

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
export const validateLongHaul = (docketNo, fromLoc, fromTown) =>
  Api.get(`/cns/validate/long-haul`, {
    params: {
      docketNo,
      fromLoc,
      fromTown,
    },
  }).then((r) => r.data.data || r.data);

/**
 * Validate docket for LOCAL DELIVERY manifest type
 * Check from sst_unloading_dtl:
 *   unld_loc_code = MANIFEST FROM LOC
 *   and (pkgs_received - desp_pkgs) > 0
 *   docket_to_loc = manifest_from_loc
 *   manifest_to_town = docket_to_town
 */
export const validateLocalDelivery = (docketNo, fromLoc, toLoc, toTown) =>
  Api.get(`/cns/validate/local-delivery`, {
    params: {
      docketNo,
      fromLoc,
      toLoc,
      toTown,
    },
  }).then((r) => r.data.data || r.data);