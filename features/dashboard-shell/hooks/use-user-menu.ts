"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logout } from "@/features/login/actions";
import { useCloseOnMobile } from "./use-close-on-mobile";

/** The sidebar's account menu: closes the mobile sidebar on navigation, and logs out. */
export function useUserMenu() {
  const router = useRouter();
  const closeOnMobile = useCloseOnMobile();
  const toastId = useRef<string | number | null>(null);

  // Logout ends on /login, outside the dashboard, so this menu unmounts: close the "logging out" toast then.
  useEffect(
    () => () => {
      if (toastId.current !== null) toast.dismiss(toastId.current);
    },
    [],
  );

  // The menu closes on click, so the wait until the login page shows is a toast instead of a spinner.
  async function logOut() {
    toastId.current = toast.loading("লগআউট হচ্ছে…");
    try {
      await logout();
      // replace: Back must not return to the dashboard. refresh: drop pages cached for the signed-in user.
      router.replace("/login");
      router.refresh();
    } catch {
      toast.dismiss(toastId.current);
      toast.error("লগআউট করা যায়নি। আবার চেষ্টা করুন।");
    }
  }

  return { closeOnMobile, logOut };
}
