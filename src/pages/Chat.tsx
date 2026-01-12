import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../hooks/useMessages';
import { usePresence } from '../hooks/usePresence';
import { useVideoCall } from '../hooks/useVideoCall';
import { User, Message } from '../types';
import { Send, Video, Phone, Circle } from 'lucide-react';

interface ChatUser extends User {
  last_message?: Message;
  unread_count?: number;
  is_online?: boolean;
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const { onlineUsers, updatePresence } = usePresence();
  const { startCall } = useVideoCall();
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { 
    messages: chatMessages, 
    sendMessage, 
    getConversations,
    markAsRead 
  } = useMessages(selectedChat || undefined);

  useEffect(() => {
    fetchChatUsers();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatUsers = async () => {
    if (!user) return;

    try {
      const conversations = await getConversations();
      const processedUsers = conversations.map((conv: any) => ({
        ...conv.user,
        last_message: conv.lastMessage,
        unread_count: conv.unreadCount,
        is_online: onlineUsers.some(ou => ou.user_id === conv.user.id && ou.status !== 'offline')
      }));
      setChatUsers(processedUsers);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle typing indicator
  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (!selectedChat) return;

    // Update presence to show typing
    updatePresence('typing', selectedChat);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      updatePresence('in_chat', selectedChat);
    }, 2000);
  };

  // Subscribe to typing indicators
  useEffect(() => {
    if (!selectedChat) return;

    const typingSubscription = supabase
      .channel(`typing:${selectedChat}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'presence_sessions',
        filter: `user_id=eq.${selectedChat}`
      }, (payload) => {
        const presence = payload.new;
        if (presence.status === 'typing' && presence.chat_with === user?.id) {
          setTypingUsers(prev => [...prev.filter(id => id !== selectedChat), selectedChat]);
          
          // Auto-remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(id => id !== selectedChat));
          }, 3000);
        } else {
          setTypingUsers(prev => prev.filter(id => id !== selectedChat));
        }
      })
      .subscribe();

    return () => {
      typingSubscription.unsubscribe();
    };
  }, [selectedChat, user]);

  // Update presence when entering/leaving chat
  useEffect(() => {
    if (selectedChat) {
      updatePresence('in_chat', selectedChat);
      
      // Mark messages as read
      const unreadMessages = chatMessages
        .filter(msg => msg.receiver_id === user?.id && !msg.read_at)
        .map(msg => msg.id);
      
      if (unreadMessages.length > 0) {
        markAsRead(unreadMessages);
      }
    }

    return () => {
      if (selectedChat) {
        updatePresence('online');
      }
    }
  }, [selectedChat, chatMessages, user, updatePresence, markAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    await sendMessage(selectedChat, newMessage.trim());
    setNewMessage('');
    
    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    updatePresence('in_chat', selectedChat);
  };

  const selectedChatUser = chatUsers.find(u => u.id === selectedChat);
  const isOtherUserTyping = typingUsers.includes(selectedChat || '');

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Chat List */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {chatUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Start a chat from the Discover page</p>
            </div>
          ) : (
            <div className="divide-y">
              {chatUsers.map((chatUser) => (
                <button
                  key={chatUser.id}
                  onClick={() => setSelectedChat(chatUser.id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedChat === chatUser.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {chatUser.username[0].toUpperCase()}
                        </span>
                      </div>
                      {chatUser.is_online && (
                        <Circle className="w-4 h-4 text-green-500 fill-current absolute -bottom-1 -right-1 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">{chatUser.username}</h3>
                        {chatUser.last_message && (
                          <span className="text-xs text-gray-500">
                            {new Date(chatUser.last_message.created_at).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      {chatUser.last_message && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {chatUser.last_message.sender_id === user?.id ? 'You: ' : ''}
                          {chatUser.last_message.content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat && selectedChatUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {selectedChatUser.username[0].toUpperCase()}
                    </span>
                  </div>
                  {selectedChatUser.is_online && (
                    <Circle className="w-3 h-3 text-green-500 fill-current absolute -bottom-0.5 -right-0.5 bg-white rounded-full" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedChatUser.username}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedChatUser.is_online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => startCall(selectedChat, 'audio')}
                  disabled={!selectedChatUser.is_online}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  onClick={() => startCall(selectedChat, 'video')}
                  disabled={!selectedChatUser.is_online}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Video className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === user?.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.created_at).toLocaleTimeString()}
                      {message.sender_id === user?.id && message.read_at && (
                        <span className="ml-1">✓✓</span>
                      )}
                      {message.sender_id === user?.id && message.delivered_at && !message.read_at && (
                        <span className="ml-1">✓</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              
              {isOtherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-gray-400 text-lg mb-2">Select a conversation</div>
              <p className="text-gray-500">Choose someone to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;