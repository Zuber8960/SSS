/**
 * Item Supplier Master — item-wise supplier rate/validity maintenance.
 *
 * Backed by the backend `/itemSuppMaster` endpoints which read/write
 * ssm_item_dtl (one row per item + supplier combination).
 */
import Api from '../services/Api';

const BASE = '/itemSuppMaster';

const unwrap = (r) => r.data?.data ?? [];

/** GET /itemSuppMaster/suppliers?loc_code → [{ supp_code, supplier_name, label }] */
export const fetchSuppList = (loc_code) =>
  Api.get(`${BASE}/suppliers`, { params: { loc_code: loc_code || undefined } }).then(unwrap);

/** GET /itemSuppMaster?item_code → existing supplier rows for the item */
export const fetchItemSuppliers = (item_code) =>
  Api.get(BASE, { params: { item_code } }).then(unwrap);

/** POST /itemSuppMaster → { success, message, data: { saved, data } } */
export const saveItemSuppliers = (payload) => Api.post(BASE, payload).then((r) => r.data);