import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../hooks/usePresence';
import { useVideoCall } from '../hooks/useVideoCall';
import { supabase } from '../lib/supabase';
import { User, UserInterest } from '../types';
import { MessageCircle, Video, UserPlus, Circle } from 'lucide-react';

interface DiscoverUser extends User {
  interests: UserInterest[];
  similarity_score?: number;
  is_online?: boolean;
}

const Discover: React.FC = () => {
  const { user } = useAuth();
  const { onlineUsers } = usePresence();
  const { startCall } = useVideoCall();
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'online'>('all');

  useEffect(() => {
    fetchUsers();
  }, [user, filter]);

  const fetchUsers = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('users')
        .select(`
          *,
          user_interests(
            interest_id,
            interests(*)
          )
        `)
        .neq('id', user.id);

      const { data: allUsers, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Get current user's interests
      const { data: userInterests } = await supabase
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', user.id);

      const userInterestIds = userInterests?.map(ui => ui.interest_id) || [];

      // Calculate similarity scores and online status
      const processedUsers = allUsers.map((discoveredUser: any) => {
        const userInterestList = discoveredUser.user_interests || [];
        const commonInterests = userInterestList.filter((ui: UserInterest) => 
          userInterestIds.includes(ui.interest_id)
        );
        
        const isOnline = onlineUsers.some(ou => ou.user_id === discoveredUser.id && ou.status !== 'offline');
        
        return {
          ...discoveredUser,
          interests: userInterestList.map((ui: any) => ({
            interest_id: ui.interest_id,
            interest: ui.interests
          })),
          similarity_score: commonInterests.length,
          is_online: isOnline
        };
      });

      // Filter and sort
      let filteredUsers = processedUsers;
      if (filter === 'online') {
        filteredUsers = processedUsers.filter(u => u.is_online);
      }

      filteredUsers.sort((a, b) => {
        // Online users first
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        
        // Then by similarity score
        return (b.similarity_score || 0) - (a.similarity_score || 0);
      });

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (targetUserId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert([
          {
            sender_id: user?.id,
            receiver_id: targetUserId,
            status: 'pending'
          }
        ]);

      if (error) {
        console.error('Error sending friend request:', error);
      } else {
        // Refresh users to update UI
        fetchUsers();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSendMessage = async (receiverId: string) => {
    // Navigate to chat with this user
    window.location.href = `/chat?user=${receiverId}`;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Discover People</h1>
            <p className="text-gray-600 mt-2">Find people who share your interests</p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Users
            </button>
            <button
              onClick={() => setFilter('online')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'online'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Online Only
            </button>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-500 text-lg mb-4">
              {filter === 'online' ? 'No users online right now' : 'No users found'}
            </div>
            <p className="text-gray-400">
              {filter === 'online' 
                ? 'Try checking back later or view all users'
                : 'Be the first to join and invite others!'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((discoveredUser) => (
              <div
                key={discoveredUser.id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {discoveredUser.username[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{discoveredUser.username}</h3>
                      <div className="flex items-center space-x-1">
                        <Circle
                          className={`w-3 h-3 ${
                            discoveredUser.is_online ? 'text-green-500 fill-current' : 'text-gray-400 fill-current'
                          }`}
                        />
                        <span className={`text-sm ${
                          discoveredUser.is_online ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {discoveredUser.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {discoveredUser.similarity_score && discoveredUser.similarity_score > 0 && (
                    <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {discoveredUser.similarity_score} match{discoveredUser.similarity_score > 1 ? 'es' : ''}
                    </div>
                  )}
                </div>

                {discoveredUser.bio && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{discoveredUser.bio}</p>
                )}

                <div className="mb-6">
                  <div className="text-sm text-gray-700 font-medium mb-2">Interests</div>
                  <div className="flex flex-wrap gap-2">
                    {discoveredUser.interests.slice(0, 6).map((ui) => (
                      <span
                        key={ui.interest_id}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                      >
                        {ui.interest?.name || 'Unknown'}
                      </span>
                    ))}
                    {discoveredUser.interests.length > 6 && (
                      <span className="text-xs text-gray-500">
                        +{discoveredUser.interests.length - 6} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSendMessage(discoveredUser.id)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat</span>
                  </button>
                  
                  <button
                    onClick={() => startCall(discoveredUser.id, 'video')}
                    disabled={!discoveredUser.is_online}
                    className="flex items-center justify-center p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => sendFriendRequest(discoveredUser.id)}
                    className="flex items-center justify-center p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;