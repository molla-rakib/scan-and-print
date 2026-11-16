"use client";

import { useSidebar } from "@/components/ui/sidebar";

/** Click handler for sidebar links: closes the mobile sidebar sheet after navigating. */
export function useCloseOnMobile() {
  const { isMobile, setOpenMobile } = useSidebar();
  return () => isMobile && setOpenMobile(false);
}
