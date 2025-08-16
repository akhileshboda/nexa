/*
  # Enable RLS for conversations and related tables

  1. Security Updates
    - Enable RLS on conversations, conversation_participants, and related tables
    - Add policies for conversation access based on participation
    - Ensure users can only see conversations they're part of
    
  2. Policies Added
    - Users can read conversations they participate in
    - Users can create conversations
    - Users can read/manage their own participation
    - Direct conversation index access control
*/

-- Enable RLS on conversations table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on conversation_participants table  
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Enable RLS on conversation_members table
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

-- Enable RLS on direct_conversation_index table
ALTER TABLE direct_conversation_index ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY IF NOT EXISTS "conversations_select_participants"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "conversations_insert_own"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Users can create conversations, participation is controlled separately

-- Conversation participants policies
CREATE POLICY IF NOT EXISTS "conversation_participants_select_own"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "conversation_participants_insert_own"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can add themselves or others if they're already in the conversation
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Conversation members policies (if different from participants)
CREATE POLICY IF NOT EXISTS "conversation_members_select_own"
  ON conversation_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_members cm2
      WHERE cm2.conversation_id = conversation_members.conversation_id
      AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "conversation_members_insert_own"
  ON conversation_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

-- Direct conversation index policies
CREATE POLICY IF NOT EXISTS "direct_conversation_index_select_own"
  ON direct_conversation_index
  FOR SELECT
  TO authenticated
  USING (a = auth.uid() OR b = auth.uid());

CREATE POLICY IF NOT EXISTS "direct_conversation_index_insert_own"
  ON direct_conversation_index
  FOR INSERT
  TO authenticated
  WITH CHECK (a = auth.uid() OR b = auth.uid());