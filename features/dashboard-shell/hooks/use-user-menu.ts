"use client";

import { logout } from "@/features/login/actions";
import { useCloseOnMobile } from "./use-close-on-mobile";

/** The sidebar's account menu: closes the mobile sidebar on navigation, and logs out. */
export function useUserMenu() {
  const closeOnMobile = useCloseOnMobile();
  return { closeOnMobile, logOut: () => logout() };
}
