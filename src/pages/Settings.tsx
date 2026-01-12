import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Block } from '../types';
import { Shield, UserX, LogOut, Bell } from 'lucide-react';

const Settings: React.FC = () => {
  const { signOut } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<Block[]>([]);
  const [notifications, setNotifications] = useState({
    messages: true,
    calls: true,
    friend_requests: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('blocks')
        .select(`
          *,
          blocked_user:users!blocks_blocked_id_fkey(username, email)
        `)
        .eq('blocker_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) {
        console.error('Error fetching blocked users:', error);
      } else {
        setBlockedUsers(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('id', blockId);

      if (error) {
        console.error('Error unblocking user:', error);
      } else {
        fetchBlockedUsers();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  const updateNotificationSettings = (setting: keyof typeof notifications, value: boolean) => {
    setNotifications(prev => ({ ...prev, [setting]: value }));
    // Here you would typically save to database or local storage
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        <div className="space-y-8">
          {/* Notifications */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Bell className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Messages</h3>
                  <p className="text-sm text-gray-500">Get notified when you receive new messages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.messages}
                    onChange={(e) => updateNotificationSettings('messages', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Calls</h3>
                  <p className="text-sm text-gray-500">Get notified for incoming calls</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.calls}
                    onChange={(e) => updateNotificationSettings('calls', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Friend Requests</h3>
                  <p className="text-sm text-gray-500">Get notified for new friend requests</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.friend_requests}
                    onChange={(e) => updateNotificationSettings('friend_requests', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy & Blocking */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Shield className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900">Privacy & Blocking</h2>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-4">
                Blocked Users ({blockedUsers.length})
              </h3>
              
              {blockedUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No blocked users. Users you block will appear here.
                </p>
              ) : (
                <div className="space-y-3">
                  {blockedUsers.map((block) => (
                    <div key={block.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {block.blocked_user?.username[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {block.blocked_user?.username || 'Unknown User'}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Blocked {new Date(block.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => unblockUser(block.id)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Account */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center space-x-3 mb-6">
              <UserX className="w-6 h-6 text-gray-500" />
              <h2 className="text-xl font-semibold text-gray-900">Account</h2>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* App Info */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About Circl</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Version: 1.0.0</p>
              <p>Real-time video calling and chatting application</p>
              <p>Built for connecting people with shared interests</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;