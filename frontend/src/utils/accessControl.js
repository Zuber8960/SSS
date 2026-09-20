import { useEffect, useState } from "react";
import { fetchAllUserRoles } from "./userRole";
import { fetchAllRoleMenus } from "./roleMenu";
import { fetchAllMenus } from "./menuMaster";

/**
 * Access control driven by the role_menu table.
 *
 * - Users with is_admin = 'Y' get full access.
 * - Other users: user_role -> role_menu (view_yn = 'Y') -> menu master menu_path.
 *   Only paths present in the menu master AND having view access are allowed.
 */

const ACCESS_CACHE_KEY = "user_allowed_paths";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("current_user") || "null") || {};
  } catch {
    return {};
  }
};

const isAdminUser = (user) => user?.is_admin === "Y";

/** Loads and caches the set of allowed route paths for the current user. */
export const loadUserMenuAccess = async () => {
  const user = readUser();

  if (isAdminUser(user)) {
    localStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({ admin: true, paths: [] }));
    return { admin: true, paths: [] };
  }

  const userId = user?.user_id;
  if (!userId) {
    localStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({ admin: false, paths: [] }));
    return { admin: false, paths: [] };
  }

  // 1. Roles assigned to this user
  const allUserRoles = await fetchAllUserRoles();
  const roleCodes = allUserRoles
    .filter((r) => r.user_id === userId)
    .map((r) => r.role_code);

  if (roleCodes.length === 0) {
    localStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({ admin: false, paths: [] }));
    return { admin: false, paths: [] };
  }

  // 2. Menus (view_yn = 'Y') granted to any of those roles
  const allRoleMenus = await fetchAllRoleMenus();
  const allowedMenuIds = new Set(
    allRoleMenus
      .filter((rm) => roleCodes.includes(rm.role_code) && rm.view_yn === "Y")
      .map((rm) => rm.menu_id)
  );

  // 3. Resolve menu_id -> menu_path (route path) from the menu master
  const menus = await fetchAllMenus();
  const paths = menus
    .filter((m) => allowedMenuIds.has(m.menu_id) && m.menu_path)
    .map((m) => m.menu_path);

  const result = { admin: false, paths };
  localStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify(result));
  return result;
};

const readCachedAccess = () => {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_CACHE_KEY) || "null") || null;
  } catch {
    return null;
  }
};

let accessPromise = null;

/** Fetch once per page-load; shared by Sidebar + all ProtectedRoutes. */
export const loadUserMenuAccessShared = () => {
  if (!accessPromise) {
    accessPromise = loadUserMenuAccess().catch((err) => {
      accessPromise = null;
      throw err;
    });
  }
  return accessPromise;
};

/** React hook: { admin, allowedPaths, loading } */
export const useMenuAccess = () => {
  const [access, setAccess] = useState(() => readCachedAccess() || { admin: false, paths: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadUserMenuAccessShared();
        if (!cancelled) setAccess(data);
      } catch (err) {
        console.error("Failed to load menu access:", err);
        if (!cancelled) setAccess({ admin: false, paths: readCachedAccess()?.paths || [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = access.admin || isAdminUser(readUser());
  const allowedPaths = isAdmin ? null : new Set(access.paths || []);

  return { isAdmin, allowedPaths, loading };
};

/** Helper: reset the access cache (e.g. on logout / re-login so it reloads). */
export const clearMenuAccessCache = () => {
  localStorage.removeItem(ACCESS_CACHE_KEY);
  accessPromise = null;
};
