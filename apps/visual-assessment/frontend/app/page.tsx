'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserProfile } from '@/lib/supabase-helpers';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace('/auth');
        return;
      }
      const profile = await getUserProfile(user.id);
      router.replace(profile?.is_manager ? '/manager' : '/dashboard');
    });
  }, [router]);

  return null;
}
