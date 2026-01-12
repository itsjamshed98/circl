import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Check, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AVAILABLE_INTERESTS = [
  { id: '1', name: 'Photography', category: 'Creative' },
  { id: '2', name: 'Gaming', category: 'Entertainment' },
  { id: '3', name: 'Music', category: 'Creative' },
  { id: '4', name: 'Travel', category: 'Lifestyle' },
  { id: '5', name: 'Cooking', category: 'Lifestyle' },
  { id: '6', name: 'Fitness', category: 'Health' },
  { id: '7', name: 'Reading', category: 'Education' },
  { id: '8', name: 'Technology', category: 'Professional' },
  { id: '9', name: 'Art', category: 'Creative' },
  { id: '10', name: 'Movies', category: 'Entertainment' },
  { id: '11', name: 'Sports', category: 'Health' },
  { id: '12', name: 'Nature', category: 'Lifestyle' },
  { id: '13', name: 'Programming', category: 'Professional' },
  { id: '14', name: 'Fashion', category: 'Lifestyle' },
  { id: '15', name: 'Business', category: 'Professional' }
];

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [availability, setAvailability] = useState<'available' | 'busy'>('available');
  const [loading, setLoading] = useState(false);
  const [customInterest, setCustomInterest] = useState('');

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const addCustomInterest = () => {
    if (customInterest.trim()) {
      const newInterest = { 
        id: `custom-${Date.now()}`, 
        name: customInterest.trim(), 
        category: 'Custom' 
      };
      AVAILABLE_INTERESTS.push(newInterest);
      setSelectedInterests(prev => [...prev, newInterest.id]);
      setCustomInterest('');
    }
  };

  const handleComplete = async () => {
    if (selectedInterests.length === 0) {
      alert('Please select at least one interest to continue');
      return;
    }

    setLoading(true);

    try {
      // Update user profile with availability
      await updateProfile({ availability });

      // Save user interests
      const interestEntries = selectedInterests.map(interestId => ({
        user_id: user?.id,
        interest_id: interestId
      }));

      const { error } = await supabase
        .from('user_interests')
        .insert(interestEntries);

      if (error) {
        console.error('Error saving interests:', error);
        alert('Failed to save interests. Please try again.');
      } else {
        navigate('/discover');
      }
    } catch (error) {
      console.error('Error during onboarding:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tell us about yourself</h1>
            <p className="text-gray-600">Select your interests to find like-minded people</p>
            <div className="flex justify-center mt-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                placeholder="Add a custom interest"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
              />
              <button
                onClick={addCustomInterest}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {AVAILABLE_INTERESTS.map((interest) => (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedInterests.includes(interest.id)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{interest.name}</div>
                    <div className="text-sm text-gray-500">{interest.category}</div>
                  </div>
                  {selectedInterests.includes(interest.id) && (
                    <Check className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Selected: {selectedInterests.length} interests
            </p>
            <button
              onClick={() => setStep(2)}
              disabled={selectedInterests.length === 0}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Step
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set your status</h1>
          <p className="text-gray-600">Let others know when you're available to chat</p>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <button
            onClick={() => setAvailability('available')}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              availability === 'available'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${
                availability === 'available' ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <div>
                <div className="font-medium text-gray-900">Available</div>
                <div className="text-sm text-gray-600">Open to chat and calls</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setAvailability('busy')}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              availability === 'busy'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${
                availability === 'busy' ? 'bg-orange-500' : 'bg-gray-300'
              }`}></div>
              <div>
                <div className="font-medium text-gray-900">Busy</div>
                <div className="text-sm text-gray-600">Available but prefer not to be disturbed</div>
              </div>
            </div>
          </button>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setStep(1)}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;