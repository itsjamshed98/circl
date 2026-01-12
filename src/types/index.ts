export interface User {
  id: string;
  email: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  last_seen?: string;
  availability: 'available' | 'busy';
}

export interface Interest {
  id: string;
  name: string;
  category?: string;
}

export interface UserInterest {
  user_id: string;
  interest_id: string;
  interest: Interest;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: User;
  receiver?: User;
}

export interface Friendship {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  friend?: User;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  delivered_at?: string;
  read_at?: string;
  sender?: User;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_user?: User;
}

export interface PresenceStatus {
  user_id: string;
  status: 'online' | 'offline' | 'typing' | 'in_chat' | 'in_call';
  last_seen?: string;
  chat_with?: string;
}

export interface CallOffer {
  caller_id: string;
  receiver_id: string;
  type: 'video' | 'audio';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  ice_candidate?: RTCIceCandidateInit;
}

export interface TypingEvent {
  user_id: string;
  chat_with: string;
  is_typing: boolean;
}

export interface AuthUser extends User {
  access_token?: string;
}