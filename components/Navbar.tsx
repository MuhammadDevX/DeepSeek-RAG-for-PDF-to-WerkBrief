"use client";
import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { SearchGoederenModal } from "@/components/SearchGoederenModal";
import { WerkbriefStateIndicator } from "@/components/WerkbriefStateIndicator";
import { ResetDataButton } from "@/components/ResetDataButton";

/**
 * Global navigation bar. Kept in its own module (instead of being exported from
 * the landing page) so the root layout does not pull the heavy landing-page
 * module (framer-motion, FeaturesBentoGrid, etc.) into every route's bundle.
 */
export const Navbar = () => {
  const { user } = useUser();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Add keyboard shortcut to open search modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        if (user) {
          // Only open if user is logged in
          setIsSearchModalOpen(true);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [user]);

  return (
    <>
      <nav className="flex w-full items-center justify-between border-t border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
        <Link href={"/"}>
          <div className="flex items-center gap-2">
            <div className="relative w-[100px] h-[80px] ms-12 overflow-hidden">
              <Image
                src="/Quick declare.png"
                alt="quickdeclare logo"
                width={120}
                height={31}
                className="object-cover scale-150"
              />
            </div>
            <h1 className="text-base font-bold md:text-2xl"></h1>
          </div>
        </Link>
        {!user ? (
          <Link href={"/sign-in"}>
            <button className="w-24 transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 md:w-32 dark:bg-white dark:text-black dark:hover:bg-gray-200">
              Login
            </button>
          </Link>
        ) : (
          <div className="flex gap-2 lg:gap-3 items-center flex-wrap">
            <WerkbriefStateIndicator />
            <Button
              variant="outline"
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center gap-2 text-xs sm:text-sm"
              size="sm"
              title="Search Goederen Code (Ctrl/Cmd + K)"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search Goederen Code</span>
              <span className="sm:hidden">Search</span>
              <span className="hidden lg:inline-flex items-center gap-1 ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                <span>⌘K</span>
              </span>
            </Button>
            <Link href={"/werkbrief-generator"}>
              <Button size="sm" className="text-xs sm:text-sm">
                Werkbrief creator
              </Button>
            </Link>
            {user.publicMetadata.role === "admin" && (
              <Link href={"/expand"}>
                <Button size="sm" className="text-xs sm:text-sm">
                  Expand KB
                </Button>
              </Link>
            )}
            {(user.publicMetadata.role === "admin" ||
              user.publicMetadata.role === "operator") && (
              <Link href={"/aruba-special"}>
                <Button size="sm" className="text-xs sm:text-sm">
                  Skypostal
                </Button>
              </Link>
            )}
            {user.publicMetadata.role === "admin" && (
              <Link href={"/admin"}>
                <Button size="sm" className="text-xs sm:text-sm">
                  Admin
                </Button>
              </Link>
            )}
            <ResetDataButton />
            <UserButton />
          </div>
        )}
      </nav>

      <SearchGoederenModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
