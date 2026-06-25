"use client";

import { createContext, use } from "react";
import type * as User from "@/server/app/user";

const AuthContext = createContext<User.Type | null>(null);

export const AuthProvider = ({
  user,
  children,
}: {
  user: User.Type;
  children: React.ReactNode;
}) => {
  return <AuthContext value={user}>{children}</AuthContext>;
};

export const useCurrentUser = () => {
  const user = use(AuthContext);
  if (!user) {
    throw new Error("useCurrentUser must be used within an AuthProvider");
  }
  return user;
};
