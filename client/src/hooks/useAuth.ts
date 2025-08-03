import { useQuery } from "@tanstack/react-query";
import React from "react";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string | null;
  role?: 'admin' | 'employee';
  createdAt?: string;
}

export function useAuth() {
  const { data: authStatus, isLoading, error } = useQuery<{ authenticated: boolean; user?: User }>({
    queryKey: ["/api/auth/status"],
    retry: false,
  });

  console.log('useAuth hook - authStatus:', authStatus);
  console.log('useAuth hook - isLoading:', isLoading);
  console.log('useAuth hook - error:', error);

  return {
    user: authStatus?.user,
    isLoading,
    isAuthenticated: authStatus?.authenticated || false,
  };
}
