'use client';

import { AuthProvider as AuthProviderInner } from '@/hooks/useAuth';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function AuthProvider({ children }: Props) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}
