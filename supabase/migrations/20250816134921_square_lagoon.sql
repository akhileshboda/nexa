/*
  # Add shared events support to messages

  1. Schema Changes
    - Add `shared_event_id` column to messages table to reference shared events
    - Add `message_type` column to distinguish between text and event messages
    
  2. Security
    - Update existing RLS policies to handle new message types
    - Ensure shared events maintain proper access control
    
  3. Indexes
    - Add index for shared_event_id for efficient event message queries
*/

-- Add columns for event sharing support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'shared_event_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN shared_event_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE messages ADD COLUMN message_type text DEFAULT 'text';
  END IF;
END $$;

-- Add foreign key constraint for shared events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_shared_event_id_fkey'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_shared_event_id_fkey 
    FOREIGN KEY (shared_event_id) REFERENCES events(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for shared event queries
CREATE INDEX IF NOT EXISTS idx_messages_shared_event 
ON messages(shared_event_id) 
WHERE shared_event_id IS NOT NULL;

-- Add check constraint for message types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_message_type_check'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_message_type_check 
    CHECK (message_type IN ('text', 'event_share'));
  END IF;
END $$;

-- Enable RLS on messages table if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for messages
CREATE POLICY IF NOT EXISTS "messages_select_participants"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "messages_insert_participants"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );