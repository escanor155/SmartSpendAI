
"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User as UserIcon, ShieldQuestion } from "lucide-react" // Changed User to UserIcon to avoid name clash
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link"; // For linking to settings/profile

export function UserNav() {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full" disabled>
        <Avatar className="h-8 w-8">
          <AvatarFallback>...</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  if (!user) {
    // Should not happen if route protection is working, but as a fallback:
    return (
      <Link href="/auth/login">
        <Button variant="outline">
          <LogIn className="mr-2 h-4 w-4" />
          Login
        </Button>
      </Link>
    );
  }

  const userInitial = user.email ? user.email.charAt(0).toUpperCase() : "?";
  // In a real app, user.displayName or a dedicated profile name would be better
  const displayName = user.displayName || user.email; 

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8" data-ai-hint="profile person">
            {user.photoURL ? (
              <AvatarImage src={user.photoURL} alt={displayName || "User"} />
            ) : (
              <AvatarImage src={`https://placehold.co/40x40.png?text=${userInitial}`} alt={displayName || "User"} />
            )}
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/settings" passHref legacyBehavior>
            <DropdownMenuItem asChild>
              <a> {/*<a> tag for DropdownMenuItem when used with Link and asChild */}
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
                 {/* <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut> */}
              </a>
            </DropdownMenuItem>
          </Link>
          <Link href="/settings" passHref legacyBehavior>
            <DropdownMenuItem asChild>
               <a>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
                {/* <DropdownMenuShortcut>⌘S</DropdownMenuShortcut> */}
               </a>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
          {/* <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut> */}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
