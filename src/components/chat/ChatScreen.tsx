import React, { useState, useEffect } from 'react';
import { MessageCircle, Plus } from 'lucide-react';
import { Conversation, ChatState } from '../../types/chat';
import { ChatService } from '../../services/chat/service';
import ConversationsList from './ConversationsList';
import ChatInterface from './ChatInterface';
import ConnectionSelector from './ConnectionSelector';
import { btnBase, cardBase } from '../UI';

export default function ChatScreen() {
  const [chatState, setChatState] = useState<ChatState>({
    conversations: [],
    connections: [],
    messages: {},
    loading: true
  });
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showConnectionSelector, setShowConnectionSelector] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setChatState(prev => ({ ...prev, loading: true }));
    try {
      const conversations = await ChatService.fetchConversations();
      setChatState(prev => ({ 
        ...prev, 
        conversations,
        loading: false 
      }));
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setChatState(prev => ({ 
        ...prev, 
        loading: false,
        error: 'Failed to load conversations'
      }));
    }
  };

  const handleStartChat = async (conversationId: string) => {
    setShowConnectionSelector(false);
    
    // Find the conversation in our list or fetch it
    let conversation = chatState.conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      // Reload conversations to get the new one
      await loadConversations();
      conversation = chatState.conversations.find(c => c.id === conversationId);
    }
    
    if (conversation) {
      setActiveConversation(conversation);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  const handleBackToList = () => {
    setActiveConversation(null);
    // Refresh conversations when returning to list
    loadConversations();
  };

  if (activeConversation) {
    return (
      <ChatInterface
        conversation={activeConversation}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-neutral-900">Messages</h1>
        </div>
        <button
          onClick={() => setShowConnectionSelector(true)}
          className={`${btnBase} bg-indigo-600 text-white hover:bg-indigo-700`}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4">
        <ConversationsList
          conversations={chatState.conversations}
          onSelectConversation={handleSelectConversation}
          loading={chatState.loading}
        />
      </div>

      {/* Connection Selector Modal */}
      {showConnectionSelector && (
        <ConnectionSelector
          onStartChat={handleStartChat}
          onClose={() => setShowConnectionSelector(false)}
        />
      )}
    </div>
  );
}