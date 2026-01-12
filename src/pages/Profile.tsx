import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Interest, UserInterest } from '../types';
import { CreditCard as Edit3, Save, X, Plus } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    availability: user?.availability || 'available'
  });
  const [userInterests, setUserInterests] = useState<UserInterest[]>([]);
  const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserInterests();
      fetchAvailableInterests();
    }
  }, [user]);

  const fetchUserInterests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_interests')
        .select(`
          *,
          interest:interests(*)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user interests:', error);
      } else {
        setUserInterests(data || []);
        setSelectedInterests(data?.map(ui => ui.interest_id) || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAvailableInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('interests')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching interests:', error);
      } else {
        setAvailableInterests(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const addCustomInterest = async () => {
    if (!customInterest.trim()) return;

    try {
      const { data, error } = await supabase
        .from('interests')
        .insert([{ name: customInterest.trim(), category: 'Custom' }])
        .select()
        .single();

      if (error) {
        console.error('Error adding custom interest:', error);
      } else if (data) {
        setAvailableInterests(prev => [...prev, data]);
        setSelectedInterests(prev => [...prev, data.id]);
        setCustomInterest('');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Update profile
      const profileResult = await updateProfile({
        username: formData.username,
        bio: formData.bio,
        availability: formData.availability as 'available' | 'busy'
      });

      if (profileResult.error) {
        alert(profileResult.error);
        return;
      }

      // Update interests
      // First, remove old interests
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id);

      // Then add new interests
      if (selectedInterests.length > 0) {
        const interestEntries = selectedInterests.map(interestId => ({
          user_id: user.id,
          interest_id: interestId
        }));

        const { error } = await supabase
          .from('user_interests')
          .insert(interestEntries);

        if (error) {
          console.error('Error updating interests:', error);
          alert('Failed to update interests');
          return;
        }
      }

      // Refresh data
      await fetchUserInterests();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      bio: user?.bio || '',
      availability: user?.availability || 'available'
    });
    setSelectedInterests(userInterests.map(ui => ui.interest_id));
    setIsEditing(false);
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  {formData.username[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  @{formData.username || 'username'}
                </h2>
                <p className="text-gray-500">{user?.email}</p>
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg">{formData.username}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              {isEditing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Tell others about yourself..."
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg min-h-[80px]">
                  {formData.bio || 'No bio added yet.'}
                </p>
              )}
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Availability
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      value="available"
                      checked={formData.availability === 'available'}
                      onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value as 'available' | 'busy' }))}
                      className="text-green-500"
                    />
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Available - Open to chat and calls</span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      value="busy"
                      checked={formData.availability === 'busy'}
                      onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value as 'available' | 'busy' }))}
                      className="text-orange-500"
                    />
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span>Busy - Prefer not to be disturbed</span>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      formData.availability === 'available' ? 'bg-green-500' : 'bg-orange-500'
                    }`}></div>
                    <span className="capitalize">{formData.availability}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interests
              </label>
              
              {isEditing && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={customInterest}
                      onChange={(e) => setCustomInterest(e.target.value)}
                      placeholder="Add a custom interest"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
                    />
                    <button
                      onClick={addCustomInterest}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {isEditing ? (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {availableInterests.map((interest) => (
                    <label key={interest.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedInterests.includes(interest.id)}
                        onChange={() => toggleInterest(interest.id)}
                        className="text-blue-500"
                      />
                      <span className="text-sm">{interest.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-2 bg-gray-50 rounded-lg">
                  {userInterests.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {userInterests.map((ui) => (
                        <span
                          key={ui.interest_id}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                        >
                          {ui.interest?.name || 'Unknown'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No interests added yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Account Info */}
            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span>{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Member since:</span>
                  <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last seen:</span>
                  <span>{user?.last_seen ? new Date(user.last_seen).toLocaleDateString() : 'Online'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;