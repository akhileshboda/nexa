export interface User {
  id: string;
  full_name: string;
  email: string;
  profile_picture_url?: string;
}

export interface Connection extends User {
  // Additional connection-specific fields can be added here
}

export interface Conversation {
  id: string;
  name?: string;
  title?: string;
  is_group: boolean;
  is_dm: boolean;
  created_at: string;
  last_message_at?: string;
  participants: User[];
  last_message?: Message;
}

export interface Message {
  id: number;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  shared_event?: SharedEvent;
}

export interface SharedEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  tags: string[];
  source: string;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversation?: Conversation;
  messages: Record<string, Message[]>;
  connections: Connection[];
  loading: boolean;
  error?: string;
}