import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Message } from '../types';

export const useMessages = (otherUserId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (userId: string, limit = 50, offset = 0) => {
    if (!user) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(username, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send a message
  const sendMessage = useCallback(async (receiverId: string, content: string) => {
    if (!user || !content.trim()) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: user.id,
          receiver_id: receiverId,
          content: content.trim(),
          delivered_at: new Date().toISOString()
        }])
        .select(`
          *,
          sender:users!messages_sender_id_fkey(username, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }, [user]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return;

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', messageIds)
        .eq('receiver_id', user.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user]);

  // Get conversation list
  const getConversations = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(*),
          receiver:users!messages_receiver_id_fkey(*)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      // Group by conversation partner
      const conversationMap = new Map();
      
      data?.forEach((message) => {
        const otherUser = message.sender_id === user.id ? message.receiver : message.sender;
        if (otherUser && !conversationMap.has(otherUser.id)) {
          conversationMap.set(otherUser.id, {
            user: otherUser,
            lastMessage: message,
            unreadCount: 0
          });
        }
      });

      // Count unread messages
      for (const [userId, conversation] of conversationMap) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', userId)
          .eq('receiver_id', user.id)
          .is('read_at', null);
        
        conversation.unreadCount = count || 0;
      }

      return Array.from(conversationMap.values());
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }, [user]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user || !otherUserId) return;

    const subscription = supabase
      .channel(`messages:${user.id}:${otherUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id}))`
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, otherUserId]);

  // Load initial messages when otherUserId changes
  useEffect(() => {
    if (otherUserId) {
      fetchMessages(otherUserId).then(setMessages);
    }
  }, [otherUserId, fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    fetchMessages,
    getConversations
  };
};