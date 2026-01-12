/*
  # Complete Circl Database Schema

  1. New Tables
    - `users` - User profiles with authentication integration
    - `interests` - Available interests/tags for matching
    - `user_interests` - Many-to-many relationship between users and interests
    - `friend_requests` - Friend request system with status tracking
    - `friends` - Established friendships
    - `messages` - Real-time chat messages with delivery tracking
    - `blocks` - User blocking system for privacy
    - `presence_sessions` - Real-time presence tracking
    - `call_sessions` - Video call session management
    - `notifications` - Real-time notification system

  2. Security
    - Enable RLS on all tables
    - Comprehensive policies for data access control
    - JWT-based authentication integration
    - Block enforcement at database level

  3. Performance
    - Optimized indexes for real-time queries
    - Efficient presence tracking
    - Message pagination support
    - Interest matching optimization
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  bio text DEFAULT '',
  avatar_url text,
  availability text DEFAULT 'available' CHECK (availability IN ('available', 'busy')),
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Interests table
CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text DEFAULT 'General',
  created_at timestamptz DEFAULT now()
);

-- User interests junction table
CREATE TABLE IF NOT EXISTS user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, interest_id)
);

-- Friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

-- Friends table
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CHECK (sender_id != receiver_id)
);

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Presence sessions table
CREATE TABLE IF NOT EXISTS presence_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'online' CHECK (status IN ('online', 'offline', 'typing', 'in_chat', 'in_call')),
  chat_with uuid REFERENCES users(id) ON DELETE SET NULL,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Call sessions table
CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_type text DEFAULT 'video' CHECK (call_type IN ('video', 'audio')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'ended', 'missed')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CHECK (caller_id != receiver_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('message', 'friend_request', 'friend_accepted', 'call', 'system')),
  title text NOT NULL,
  content text,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_availability ON users(availability);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);

CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest_id ON user_interests(interest_id);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

CREATE INDEX IF NOT EXISTS idx_friends_user1 ON friends(user1_id);
CREATE INDEX IF NOT EXISTS idx_friends_user2 ON friends(user2_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

CREATE INDEX IF NOT EXISTS idx_presence_user_id ON presence_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_status ON presence_sessions(status);
CREATE INDEX IF NOT EXISTS idx_presence_updated_at ON presence_sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver ON call_sessions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for interests table
CREATE POLICY "Anyone can view interests" ON interests
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create interests" ON interests
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS Policies for user_interests table
CREATE POLICY "Users can view all user interests" ON user_interests
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own interests" ON user_interests
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for friend_requests table
CREATE POLICY "Users can view their friend requests" ON friend_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests" ON friend_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received requests" ON friend_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

-- RLS Policies for friends table
CREATE POLICY "Users can view friendships" ON friends
  FOR SELECT TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create friendships" ON friends
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own friendships" ON friends
  FOR DELETE TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS Policies for messages table
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = receiver_id AND blocked_id = auth.uid()) OR
            (blocker_id = auth.uid() AND blocked_id = receiver_id)
    )
  );

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id);

-- RLS Policies for blocks table
CREATE POLICY "Users can view their blocks" ON blocks
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can manage their blocks" ON blocks
  FOR ALL TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- RLS Policies for presence_sessions table
CREATE POLICY "Users can view presence" ON presence_sessions
  FOR SELECT TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = user_id AND blocked_id = auth.uid()) OR
            (blocker_id = auth.uid() AND blocked_id = user_id)
    )
  );

CREATE POLICY "Users can manage own presence" ON presence_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for call_sessions table
CREATE POLICY "Users can view their calls" ON call_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create calls" ON call_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = caller_id AND
    NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = receiver_id AND blocked_id = auth.uid()) OR
            (blocker_id = auth.uid() AND blocked_id = receiver_id)
    )
  );

CREATE POLICY "Users can update their calls" ON call_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- RLS Policies for notifications table
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Insert default interests
INSERT INTO interests (name, category) VALUES
  ('Photography', 'Creative'),
  ('Gaming', 'Entertainment'),
  ('Music', 'Creative'),
  ('Travel', 'Lifestyle'),
  ('Cooking', 'Lifestyle'),
  ('Fitness', 'Health'),
  ('Reading', 'Education'),
  ('Technology', 'Professional'),
  ('Art', 'Creative'),
  ('Movies', 'Entertainment'),
  ('Sports', 'Health'),
  ('Nature', 'Lifestyle'),
  ('Programming', 'Professional'),
  ('Fashion', 'Lifestyle'),
  ('Business', 'Professional'),
  ('Dancing', 'Creative'),
  ('Writing', 'Creative'),
  ('Yoga', 'Health'),
  ('Meditation', 'Health'),
  ('Hiking', 'Lifestyle'),
  ('Coffee', 'Lifestyle'),
  ('Wine', 'Lifestyle'),
  ('Pets', 'Lifestyle'),
  ('Gardening', 'Lifestyle'),
  ('DIY', 'Creative'),
  ('Science', 'Education'),
  ('History', 'Education'),
  ('Languages', 'Education'),
  ('Volunteering', 'Social'),
  ('Networking', 'Professional')
ON CONFLICT (name) DO NOTHING;

-- Functions for better performance and functionality

-- Function to get mutual friends count
CREATE OR REPLACE FUNCTION get_mutual_friends_count(user1_uuid uuid, user2_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM friends f1
    JOIN friends f2 ON (
      (f1.user1_id = f2.user1_id OR f1.user1_id = f2.user2_id OR f1.user2_id = f2.user1_id OR f1.user2_id = f2.user2_id)
      AND f1.id != f2.id
    )
    WHERE (f1.user1_id = user1_uuid OR f1.user2_id = user1_uuid)
    AND (f2.user1_id = user2_uuid OR f2.user2_id = user2_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get interest similarity score
CREATE OR REPLACE FUNCTION get_interest_similarity(user1_uuid uuid, user2_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM user_interests ui1
    JOIN user_interests ui2 ON ui1.interest_id = ui2.interest_id
    WHERE ui1.user_id = user1_uuid AND ui2.user_id = user2_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user1_uuid uuid, user2_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friends
    WHERE (user1_id = user1_uuid AND user2_id = user2_uuid)
    OR (user1_id = user2_uuid AND user2_id = user1_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_blocked(blocker_uuid uuid, blocked_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocks
    WHERE blocker_id = blocker_uuid AND blocked_id = blocked_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_requests_updated_at BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_presence_sessions_updated_at BEFORE UPDATE ON presence_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();