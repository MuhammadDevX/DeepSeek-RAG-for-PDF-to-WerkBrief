"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export function useIsAdmin() {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      const role = user.publicMetadata?.role as string | undefined;
      setIsAdmin(role === "admin" || role === "operator");
    } else {
      setIsAdmin(false);
    }
  }, [user, isLoaded]);

  return { isAdmin, isLoaded };
}
