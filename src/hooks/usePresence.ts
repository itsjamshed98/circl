import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PresenceStatus } from '../types';

export const usePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceStatus[]>([]);

  useEffect(() => {
    if (!user) return;

    // Set user as online
    const setOnline = async () => {
      await supabase
        .from('presence_sessions')
        .upsert({
          user_id: user.id,
          status: 'online',
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
    };

    // Set user as offline
    const setOffline = async () => {
      await supabase
        .from('presence_sessions')
        .update({
          status: 'offline',
          last_seen: new Date().toISOString()
        })
        .eq('user_id', user.id);
    };

    // Fetch initial presence data
    const fetchPresence = async () => {
      const { data } = await supabase
        .from('presence_sessions')
        .select('*')
        .neq('user_id', user.id);
      
      if (data) {
        setOnlineUsers(data);
      }
    };

    // Subscribe to presence changes
    const presenceSubscription = supabase
      .channel('presence')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'presence_sessions'
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setOnlineUsers(prev => {
            const filtered = prev.filter(p => p.user_id !== payload.new.user_id);
            return [...filtered, payload.new as PresenceStatus];
          });
        } else if (payload.eventType === 'DELETE') {
          setOnlineUsers(prev => prev.filter(p => p.user_id !== payload.old.user_id));
        }
      })
      .subscribe();

    setOnline();
    fetchPresence();

    // Cleanup on unmount
    const handleBeforeUnload = () => {
      setOffline();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      setOffline();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      presenceSubscription.unsubscribe();
    };
  }, [user]);

  const updatePresence = async (status: PresenceStatus['status'], chatWith?: string) => {
    if (!user) return;

    await supabase
      .from('presence_sessions')
      .upsert({
        user_id: user.id,
        status,
        chat_with: chatWith || null,
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
  };

  return {
    onlineUsers,
    updatePresence
  };
};