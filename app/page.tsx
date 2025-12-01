"use client";
import { motion } from "motion/react";
import { FeaturesBentoGrid } from "./_components/FeaturesBentoGrid";
import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SearchGoederenModal } from "@/components/SearchGoederenModal";
import { WerkbriefStateIndicator } from "@/components/WerkbriefStateIndicator";
import { ResetDataButton } from "@/components/ResetDataButton";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
export default function HeroSectionOne() {
  return (
    <div className="relative my-10 flex flex-col items-center justify-center">
      {/* <Navbar /> */}
      <div className="absolute inset-y-0 left-0 h-full w-px bg-neutral-200/80 dark:bg-neutral-800/80">
        <div className="absolute top-0 h-40 w-px bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
      </div>
      <div className="absolute inset-y-0 right-0 h-full w-px bg-neutral-200/80 dark:bg-neutral-800/80">
        <div className="absolute h-40 w-px bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px w-full bg-neutral-200/80 dark:bg-neutral-800/80">
        <div className="absolute mx-auto h-px w-40 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
      </div>
      <div className="px-4 py-10 md:py-20">
        <h1 className="relative z-10 mx-auto max-w-4xl text-center text-2xl font-bold text-slate-700 md:text-4xl lg:text-7xl dark:text-slate-300">
          {"Werkbrief creation with AI Agents".split(" ").map((word, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.1,
                ease: "easeInOut",
              }}
              className="mr-2 inline-block"
            >
              {word}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            duration: 0.3,
            delay: 0.8,
          }}
          className="relative z-10 mx-auto max-w-xl py-4 text-center text-lg font-normal text-neutral-600 dark:text-neutral-400"
        >
          Create instant, accurate werkbriefs from pdf invoices. Have a 24/7
          working model to create workbriefs in one click.
        </motion.p>
        <Link href={"/sign-in"}>
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              duration: 0.3,
              delay: 1,
            }}
            className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <button className="w-60 transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200">
              Explore Now
            </button>
          </motion.div>
        </Link>
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.3,
            delay: 1.2,
          }}
          className="relative z-10 mt-20 rounded-3xl border border-neutral-200 bg-neutral-100 p-4 shadow-md dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="w-full overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700">
            <img
              src="https://assets.aceternity.com/pro/aceternity-landing.webp"
              alt="Landing page preview"
              className="aspect-[16/9] h-auto w-full object-cover"
              height={1000}
              width={1000}
            />
          </div>
        </motion.div>
      </div>
      <FeaturesBentoGrid />
    </div>
  );
}

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
