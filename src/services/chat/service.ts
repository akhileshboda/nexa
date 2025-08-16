import { supabase } from "../../lib/supabase";
import { User, Connection, Conversation, Message } from "../../types/chat";

export class ChatService {
  // Fetch user's connections (other users they can chat with)
  static async fetchConnections(): Promise<Connection[]> {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, full_name, email, profile_picture_url")
      .neq("id", (await supabase.auth.getUser()).data.user?.id);

    if (error) throw error;
    return users || [];
  }

  // Create or get existing direct conversation
  static async createOrGetDirectConversation(participantId: string): Promise<string> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error("Not authenticated");

    const userIds = [currentUser.id, participantId].sort();
    
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("direct_conversation_index")
      .select("conversation_id")
      .eq("a", userIds[0])
      .eq("b", userIds[1])
      .single();

    if (existing) {
      return existing.conversation_id;
    }

    // Create new conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        is_dm: true,
        is_group: false,
        name: null
      })
      .select("id")
      .single();

    if (convError) throw convError;

    // Add to direct conversation index
    await supabase
      .from("direct_conversation_index")
      .insert({
        a: userIds[0],
        b: userIds[1],
        conversation_id: conversation.id
      });

    // Add participants
    await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: conversation.id, user_id: currentUser.id },
        { conversation_id: conversation.id, user_id: participantId }
      ]);

    return conversation.id;
  }

  // Create group conversation
  static async createGroupConversation(participantIds: string[], groupName: string): Promise<string> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error("Not authenticated");

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        is_dm: false,
        is_group: true,
        name: groupName,
        title: groupName
      })
      .select("id")
      .single();

    if (convError) throw convError;

    // Add all participants including current user
    const allParticipants = [currentUser.id, ...participantIds];
    const participantInserts = allParticipants.map(userId => ({
      conversation_id: conversation.id,
      user_id: userId
    }));

    await supabase
      .from("conversation_participants")
      .insert(participantInserts);

    return conversation.id;
  }

  // Fetch user's conversations
  static async fetchConversations(): Promise<Conversation[]> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) return [];

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(`
        id,
        name,
        title,
        is_group,
        is_dm,
        created_at,
        last_message_at,
        conversation_participants!inner(
          user_id,
          users!inner(id, full_name, email, profile_picture_url)
        )
      `)
      .eq("conversation_participants.user_id", currentUser.id)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) throw error;

    return (conversations || []).map(conv => ({
      id: conv.id,
      name: conv.name,
      title: conv.title,
      is_group: conv.is_group,
      is_dm: conv.is_dm,
      created_at: conv.created_at,
      last_message_at: conv.last_message_at,
      participants: conv.conversation_participants
        .map(p => p.users)
        .filter(u => u.id !== currentUser.id) // Exclude current user from participants list
    }));
  }

  // Fetch messages for a conversation
  static async fetchMessages(conversationId: string): Promise<Message[]> {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return messages || [];
  }

  // Send a text message
  static async sendMessage(conversationId: string, text: string): Promise<void> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        text
      });

    if (error) throw error;
  }

  // Share an event to a conversation
  static async shareEvent(conversationId: string, eventId: string): Promise<void> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error("Not authenticated");

    // Send message with shared event reference
    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        text: "📅 Shared an event",
        message_type: "event_share",
        shared_event_id: eventId
      });

    if (error) throw error;
  }

  // Fetch messages with event details for shared events
  static async fetchMessagesWithEvents(conversationId: string): Promise<Message[]> {
    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        *,
        events:shared_event_id (
          id,
          title,
          starts_at,
          location,
          tags,
          source
        )
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    
    return (messages || []).map(msg => ({
      ...msg,
      shared_event: msg.events ? {
        id: msg.events.id,
        title: msg.events.title,
        time: new Date(msg.events.starts_at).toLocaleString(undefined, {
          weekday: "short",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        location: msg.events.location || "",
        tags: msg.events.tags || [],
        source: msg.events.source || ""
      } : undefined
    }));
  }
}