import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAdminRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      } as any);
      setIsAdmin(!!data);
      setLoading(false);
    };

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
};
