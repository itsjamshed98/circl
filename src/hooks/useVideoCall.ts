import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface CallSession {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: 'video' | 'audio';
  status: 'pending' | 'accepted' | 'rejected' | 'ended' | 'missed';
  started_at?: string;
  ended_at?: string;
}

export const useVideoCall = () => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnection.current) return;

    peerConnection.current = new RTCPeerConnection(rtcConfig);

    peerConnection.current.onicecandidate = async (event) => {
      if (event.candidate && currentCall) {
        // Send ICE candidate through Supabase realtime
        await supabase
          .channel(`call:${currentCall.id}`)
          .send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: {
              candidate: event.candidate,
              callId: currentCall.id
            }
          });
      }
    };

    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.current.onconnectionstatechange = () => {
      if (peerConnection.current?.connectionState === 'disconnected') {
        endCall();
      }
    };
  }, [currentCall]);

  // Get user media
  const getUserMedia = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Start a call
  const startCall = useCallback(async (receiverId: string, callType: 'video' | 'audio' = 'video') => {
    if (!user) return;

    try {
      // Create call session in database
      const { data: callSession, error } = await supabase
        .from('call_sessions')
        .insert([{
          caller_id: user.id,
          receiver_id: receiverId,
          call_type: callType,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating call session:', error);
        return;
      }

      setCurrentCall(callSession);
      
      // Get user media
      const stream = await getUserMedia(callType === 'video', true);
      
      // Initialize peer connection
      initializePeerConnection();
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
      });

      // Create offer
      const offer = await peerConnection.current?.createOffer();
      await peerConnection.current?.setLocalDescription(offer);

      // Send offer through Supabase realtime
      await supabase
        .channel(`call:${callSession.id}`)
        .send({
          type: 'broadcast',
          event: 'call-offer',
          payload: {
            offer,
            callId: callSession.id,
            callType
          }
        });

    } catch (error) {
      console.error('Error starting call:', error);
    }
  }, [user, getUserMedia, initializePeerConnection]);

  // Accept incoming call
  const acceptCall = useCallback(async (callId: string) => {
    if (!currentCall) return;

    try {
      // Update call status
      await supabase
        .from('call_sessions')
        .update({
          status: 'accepted',
          started_at: new Date().toISOString()
        })
        .eq('id', callId);

      setIsCallActive(true);
      setIncomingCall(null);

      // Get user media
      const stream = await getUserMedia(currentCall.call_type === 'video', true);
      
      // Initialize peer connection
      initializePeerConnection();
      
      // Add local stream
      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
      });

    } catch (error) {
      console.error('Error accepting call:', error);
    }
  }, [currentCall, getUserMedia, initializePeerConnection]);

  // Reject call
  const rejectCall = useCallback(async (callId: string) => {
    try {
      await supabase
        .from('call_sessions')
        .update({
          status: 'rejected',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      setIncomingCall(null);
      setCurrentCall(null);
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  }, []);

  // End call
  const endCall = useCallback(async () => {
    try {
      if (currentCall) {
        await supabase
          .from('call_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', currentCall.id);
      }

      // Close peer connection
      peerConnection.current?.close();
      peerConnection.current = null;

      // Stop local stream
      localStream?.getTracks().forEach(track => track.stop());
      
      // Reset state
      setLocalStream(null);
      setRemoteStream(null);
      setIsCallActive(false);
      setCurrentCall(null);
      setIncomingCall(null);

    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, [currentCall, localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Subscribe to call events
  useEffect(() => {
    if (!user) return;

    const callSubscription = supabase
      .channel('call_events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_sessions',
        filter: `receiver_id=eq.${user.id}`
      }, (payload) => {
        const callSession = payload.new as CallSession;
        if (callSession.status === 'pending') {
          setIncomingCall(callSession);
          setCurrentCall(callSession);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_sessions'
      }, (payload) => {
        const callSession = payload.new as CallSession;
        if (currentCall?.id === callSession.id) {
          setCurrentCall(callSession);
          
          if (callSession.status === 'ended' || callSession.status === 'rejected') {
            endCall();
          }
        }
      })
      .subscribe();

    return () => {
      callSubscription.unsubscribe();
    };
  }, [user, currentCall, endCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    localStream,
    remoteStream,
    isCallActive,
    incomingCall,
    currentCall,
    isVideoEnabled,
    isAudioEnabled,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio
  };
};