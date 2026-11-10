"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDownIcon,
  LayoutDashboardIcon,
  ListOrderedIcon,
  LogOutIcon,
  PrinterIcon,
  QrCodeIcon,
  SettingsIcon,
  ShieldIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { logout } from "@/app/login/actions";

const nav = [
  {
    href: "/dashboard",
    label: "সারসংক্ষেপ",
    icon: LayoutDashboardIcon,
    color: "text-blue-600",
  },
  {
    href: "/dashboard/jobs",
    label: "প্রিন্ট অর্ডার",
    icon: ListOrderedIcon,
    color: "text-violet-600",
  },
  {
    href: "/dashboard/devices",
    label: "ডিভাইস",
    icon: PrinterIcon,
    color: "text-emerald-600",
  },
  {
    href: "/dashboard/qr",
    label: "QR ও লিংক",
    icon: QrCodeIcon,
    color: "text-amber-600",
  },
  {
    href: "/dashboard/settings",
    label: "সেটিংস",
    icon: SettingsIcon,
    color: "text-sky-600",
  },
];

// Active item: solid royal blue with white text and icon.
const activeClass =
  "data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary/90 data-active:hover:text-sidebar-primary-foreground data-active:[&>svg]:text-sidebar-primary-foreground";

function useCloseOnMobile() {
  const { isMobile, setOpenMobile } = useSidebar();
  return () => isMobile && setOpenMobile(false);
}

/**
 * The sidebar shell renders outside any Suspense boundary so it hydrates together with
 * SidebarProvider (which decides desktop vs mobile). User-specific parts stream into the slots.
 */
export function AppSidebar({
  extraItems,
  footer,
}: {
  extraItems?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const closeOnMobile = useCloseOnMobile();

  return (
    <Sidebar>
      <SidebarHeader className="px-5 py-5">
        <Logo className="h-7" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={
                      item.href === "/dashboard"
                        ? pathname === item.href
                        : pathname.startsWith(item.href)
                    }
                    className={activeClass}
                    render={<Link href={item.href} onClick={closeOnMobile} />}
                  >
                    <item.icon className={item.color} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {extraItems}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>{footer}</SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AdminNavItem() {
  const pathname = usePathname();
  const closeOnMobile = useCloseOnMobile();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={pathname.startsWith("/dashboard/admin")}
        className={activeClass}
        render={<Link href="/dashboard/admin" onClick={closeOnMobile} />}
      >
        <ShieldIcon className="text-rose-600" />
        <span>অ্যাডমিন</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function UserMenu({
  title,
  email,
  isAdmin,
}: {
  title: string;
  email: string;
  isAdmin: boolean;
}) {
  const closeOnMobile = useCloseOnMobile();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
        <Avatar className="size-8 rounded-lg">
          <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
            {title.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">{title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {email}
          </span>
        </div>
        <ChevronsUpDownIcon className="ml-auto size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-(--anchor-width) min-w-56"
      >
        {/* Base UI requires GroupLabel to sit inside a Group; without it the menu throws on open. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/dashboard/settings" onClick={closeOnMobile} />}
        >
          <SettingsIcon /> সেটিংস
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            render={<Link href="/dashboard/admin" onClick={closeOnMobile} />}
          >
            <ShieldIcon /> অ্যাডমিন
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => logout()}>
          <LogOutIcon /> লগআউট
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
