"use client"

import { Fragment } from "react"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { useFileActions, type OrderFile } from "../hooks/use-file-actions"

/**
 * "অ্যাকশন" dropdown with the print actions of an order's files (cancel, done, reprint), grouped under
 * each file's name when there are several. Shown just before the order's link menu.
 */
export function FileActionsMenu({ files }: { files: OrderFile[] }) {
  const { pending, groups } = useFileActions(files)
  if (!groups.length) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
        {pending ? <Spinner /> : null} অ্যাকশন <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {groups.map(({ file, actions }, i) => (
          <Fragment key={file.id}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              {/* GroupLabel must sit inside a Group in Base UI. */}
              {files.length > 1 && <DropdownMenuLabel className="max-w-56 truncate">{file.name}</DropdownMenuLabel>}
              {actions.map((action) => (
                <DropdownMenuItem key={action.label} onClick={action.onClick} variant={action.destructive ? "destructive" : "default"}>
                  <action.icon /> {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
