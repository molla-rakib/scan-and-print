import { getUserAndShop } from "@/lib/auth"
import { AdminNavItem } from "./app-sidebar"
import { UserMenu } from "./user-menu"

// Sidebar slots must not redirect: an admin without a shop can still open the admin panel.
export async function SidebarAdminItem() {
  const { user } = await getUserAndShop()
  return user.isAdmin ? <AdminNavItem /> : null
}

export async function SidebarUser() {
  const { user, shop } = await getUserAndShop()
  return <UserMenu title={shop?.name ?? (user.name || user.email)} email={user.email} isAdmin={user.isAdmin} />
}
