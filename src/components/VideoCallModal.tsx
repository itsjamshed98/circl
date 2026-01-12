import React from 'react';
import { useVideoCall } from '../hooks/useVideoCall';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';

const VideoCallModal: React.FC = () => {
  const {
    localStream,
    remoteStream,
    isCallActive,
    incomingCall,
    currentCall,
    isVideoEnabled,
    isAudioEnabled,
    localVideoRef,
    remoteVideoRef,
    acceptCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio
  } = useVideoCall();

  if (!currentCall && !incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="w-full h-full relative">
        {/* Remote video */}
        {remoteStream && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Local video */}
        {localStream && (
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Incoming call UI */}
        {incomingCall && !isCallActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 text-center">
              <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Video className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Incoming {incomingCall.call_type} call
              </h3>
              <p className="text-gray-600 mb-6">
                Someone is calling you
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => rejectCall(incomingCall.id)}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>Decline</span>
                </button>
                <button
                  onClick={() => acceptCall(incomingCall.id)}
                  className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <Phone className="w-5 h-5" />
                  <span>Accept</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Call controls */}
        {isCallActive && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-4 bg-gray-900 bg-opacity-80 rounded-full px-6 py-4">
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  isAudioEnabled 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>
              
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  isVideoEnabled 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>
              
              <button
                onClick={endCall}
                className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Call status */}
        {currentCall && !isCallActive && !incomingCall && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                <Phone className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Calling...</h3>
              <p className="text-gray-300">Waiting for answer</p>
              <button
                onClick={endCall}
                className="mt-6 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallModal;