"use client";

import { useEffect, useState } from "react";

export function useUserRole(): string {
  const [role, setRole] = useState("");

  useEffect(() => {
    setRole(window.localStorage.getItem("userRole") ?? "");
  }, []);

  return role;
}
