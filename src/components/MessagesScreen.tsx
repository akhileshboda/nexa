import React, { useState, useEffect, useRef } from 'react';
import { Plus, Send } from 'lucide-react';
import { db, type Conversation, type Message, type Profile } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Avatar from './Avatar';
import { btnBase, cardBase, cx } from './UI';

interface MessagesScreenProps {
  currentUserId: string;
}

export default function MessagesScreen({ currentUserId }: MessagesScreenProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, [currentUserId]);

  // Load messages when chat changes
  useEffect(() => {
    if (currentChat) {
      loadMessages(currentChat);
      
      // Subscribe to real-time messages
      const subscription = db.subscribeToMessages(currentChat, (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [currentChat]);

  const loadConversations = async () => {
    setLoading(true);
    const convos = await db.getConversations(currentUserId);
    setConversations(convos);
    
    // Auto-select first conversation
    if (convos.length > 0 && !currentChat) {
      setCurrentChat(convos[0].id);
    }
    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    const msgs = await db.getMessages(conversationId);
    setMessages(msgs);
  };

  const sendMessage = async (content: string) => {
    if (!currentChat || !content.trim() || sendingMessage) return;

    setSendingMessage(true);
    const message = await db.sendMessage(currentChat, currentUserId, content.trim());
    setSendingMessage(false);

    if (message) {
      // Message will be added via real-time subscription
      // But add it immediately for better UX
      setMessages(prev => [...prev, message]);
    }
  };

  const getOtherParticipant = (conversation: Conversation): Profile | null => {
    if (!conversation.profiles) return null;
    
    return conversation.profiles.find(p => p.id !== currentUserId) || null;
  };

  if (loading) {
    return (
      <div className={cardBase}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Conversations */}
      <div className={cardBase}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Conversations</div>
          <button 
            className={cx(btnBase, "border bg-white text-xs")}
            onClick={() => alert("In a full build, you could start a new chat from a liked profile.")}
          >
            <Plus className="mr-1 h-3.5 w-3.5"/> New
          </button>
        </div>
        
        {conversations.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {conversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation);
              if (!otherUser) return null;

              return (
                <button
                  key={conversation.id}
                  onClick={() => setCurrentChat(conversation.id)}
                  className={cx(
                    "flex min-w-[140px] items-center gap-2 rounded-xl border px-3 py-2",
                    currentChat === conversation.id ? "border-indigo-500 bg-indigo-50" : "bg-white"
                  )}
                >
                  <Avatar name={otherUser.name} size={32} seed={otherUser.name.length} />
                  <div className="min-w-0 text-left">
                    <div className="truncate text-xs font-medium">{otherUser.name}</div>
                    <div className="truncate text-[11px] text-neutral-600">{otherUser.course}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-neutral-600">
            No conversations yet. Like a profile to get started.
          </div>
        )}
      </div>

      {/* Active chat */}
      {currentChat && (
        <ChatBox 
          conversationId={currentChat}
          messages={messages}
          currentUserId={currentUserId}
          onSendMessage={sendMessage}
          sendingMessage={sendingMessage}
          otherUser={getOtherParticipant(conversations.find(c => c.id === currentChat)!)}
        />
      )}
    </div>
  );
}

interface ChatBoxProps {
  conversationId: string;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  sendingMessage: boolean;
  otherUser: Profile | null;
}

function ChatBox({ messages, currentUserId, onSendMessage, sendingMessage, otherUser }: ChatBoxProps) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !sendingMessage) {
      onSendMessage(text);
      setText("");
    }
  };

  if (!otherUser) {
    return (
      <div className={cardBase}>
        <div className="text-sm text-neutral-600">Unable to load conversation details.</div>
      </div>
    );
  }

  return (
    <div className={cardBase}>
      <div className="mb-2 flex items-center gap-2">
        <Avatar name={otherUser.name} size={36} seed={otherUser.name.length} />
        <div>
          <div className="text-sm font-semibold">{otherUser.name}</div>
          <div className="text-xs text-neutral-600">{otherUser.course} • {otherUser.uni}</div>
        </div>
      </div>
      
      <div className="h-64 overflow-y-auto rounded-xl border bg-white p-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-neutral-500">
            Start a conversation with {otherUser.name}
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={cx(
                "mb-2 flex", 
                message.sender_id === currentUserId ? "justify-end" : "justify-start"
              )}
            >
              <div 
                className={cx(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm", 
                  message.sender_id === currentUserId 
                    ? "bg-neutral-900 text-white" 
                    : "bg-neutral-100"
                )}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      
      <form className="mt-2 flex items-center gap-2" onSubmit={handleSubmit}>
        <input
          className="flex-1 rounded-2xl border px-3 py-2 text-sm outline-none focus:border-neutral-400"
          placeholder="Write a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sendingMessage}
        />
        <button 
          type="submit"
          className={cx(
            btnBase, 
            sendingMessage 
              ? "bg-neutral-300 text-neutral-500 cursor-not-allowed" 
              : "bg-indigo-600 text-white"
          )}
          disabled={sendingMessage || !text.trim()}
        >
          {sendingMessage ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}