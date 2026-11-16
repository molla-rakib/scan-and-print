"use client";

import Link from "next/link";
import { ChevronsUpDownIcon, LogOutIcon, SettingsIcon, ShieldIcon } from "lucide-react";
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
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useUserMenu } from "../hooks/use-user-menu";

/** Account menu in the sidebar footer: shop name and email, settings, admin and logout. */
export function UserMenu({
  title,
  email,
  isAdmin,
}: {
  title: string;
  email: string;
  isAdmin: boolean;
}) {
  const { closeOnMobile, logOut } = useUserMenu();
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
        <DropdownMenuItem variant="destructive" onClick={logOut}>
          <LogOutIcon /> লগআউট
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
