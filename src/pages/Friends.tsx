import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../hooks/usePresence';
import { supabase } from '../lib/supabase';
import { User, FriendRequest, Friendship } from '../types';
import { UserPlus, UserCheck, UserX, MessageCircle, Circle } from 'lucide-react';

const Friends: React.FC = () => {
  const { user } = useAuth();
  const { onlineUsers } = usePresence();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFriendsData();
    }
  }, [user]);

  const fetchFriendsData = async () => {
    if (!user) return;

    try {
      // Fetch friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          *,
          user1:users!friends_user1_id_fkey(*),
          user2:users!friends_user2_id_fkey(*)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (friendsError) {
        console.error('Error fetching friends:', friendsError);
      } else {
        const processedFriends = friendsData?.map(friendship => ({
          ...friendship,
          friend: friendship.user1_id === user.id ? friendship.user2 : friendship.user1
        })) || [];
        setFriends(processedFriends);
      }

      // Fetch incoming friend requests
      const { data: incomingData, error: incomingError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:users!friend_requests_sender_id_fkey(*)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (incomingError) {
        console.error('Error fetching incoming requests:', incomingError);
      } else {
        setIncomingRequests(incomingData || []);
      }

      // Fetch outgoing friend requests
      const { data: outgoingData, error: outgoingError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          receiver:users!friend_requests_receiver_id_fkey(*)
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (outgoingError) {
        console.error('Error fetching outgoing requests:', outgoingError);
      } else {
        setOutgoingRequests(outgoingData || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptFriendRequest = async (requestId: string, senderId: string) => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error accepting request:', updateError);
        return;
      }

      // Create friendship
      const { error: friendshipError } = await supabase
        .from('friends')
        .insert([{
          user1_id: senderId,
          user2_id: user?.id
        }]);

      if (friendshipError) {
        console.error('Error creating friendship:', friendshipError);
        return;
      }

      // Refresh data
      fetchFriendsData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) {
        console.error('Error rejecting request:', error);
        return;
      }

      fetchFriendsData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      if (error) {
        console.error('Error removing friend:', error);
        return;
      }

      fetchFriendsData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.some(ou => ou.user_id === userId && ou.status !== 'offline');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading friends...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Friends</h1>

        {/* Incoming Friend Requests */}
        {incomingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Friend Requests</h2>
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {request.sender?.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{request.sender?.username}</h3>
                        <p className="text-sm text-gray-500">Sent you a friend request</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => acceptFriendRequest(request.id, request.sender_id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-1"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(request.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
                      >
                        <UserX className="w-4 h-4" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing Friend Requests */}
        {outgoingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Requests</h2>
            <div className="space-y-3">
              {outgoingRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {request.receiver?.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{request.receiver?.username}</h3>
                        <p className="text-sm text-gray-500">Friend request pending</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Sent {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your Friends ({friends.length})
          </h2>
          
          {friends.length === 0 ? (
            <div className="text-center py-16">
              <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-500 text-lg mb-2">No friends yet</div>
              <p className="text-gray-400">
                Send friend requests from the Discover page to connect with others
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map((friendship) => (
                <div key={friendship.id} className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {friendship.friend?.username[0].toUpperCase()}
                          </span>
                        </div>
                        {isUserOnline(friendship.friend?.id || '') && (
                          <Circle className="w-4 h-4 text-green-500 fill-current absolute -bottom-1 -right-1 bg-white rounded-full" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{friendship.friend?.username}</h3>
                        <div className="flex items-center space-x-1">
                          <Circle
                            className={`w-2 h-2 ${
                              isUserOnline(friendship.friend?.id || '') 
                                ? 'text-green-500 fill-current' 
                                : 'text-gray-400 fill-current'
                            }`}
                          />
                          <span className={`text-sm ${
                            isUserOnline(friendship.friend?.id || '') 
                              ? 'text-green-600' 
                              : 'text-gray-500'
                          }`}>
                            {isUserOnline(friendship.friend?.id || '') ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.location.href = `/chat?user=${friendship.friend?.id}`}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => removeFriend(friendship.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <UserX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Friends;