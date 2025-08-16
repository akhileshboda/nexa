import React from 'react';
import { MessageCircle, Users, User } from 'lucide-react';
import { Conversation } from '../../types/chat';
import Avatar from '../Avatar';
import { cx } from '../UI';

interface ConversationsListProps {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  loading: boolean;
}

export default function ConversationsList({ 
  conversations, 
  onSelectConversation, 
  loading 
}: ConversationsListProps) {
  const getConversationName = (conversation: Conversation) => {
    if (conversation.name || conversation.title) {
      return conversation.name || conversation.title;
    }
    if (conversation.is_dm && conversation.participants.length > 0) {
      return conversation.participants[0].full_name || conversation.participants[0].email;
    }
    return 'Unknown Conversation';
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (conversation.last_message) {
      return conversation.last_message.text.length > 50 
        ? conversation.last_message.text.substring(0, 50) + '...'
        : conversation.last_message.text;
    }
    return 'No messages yet';
  };

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.is_dm && conversation.participants.length > 0) {
      const participant = conversation.participants[0];
      return (
        <Avatar 
          name={participant.full_name || participant.email} 
          size={48}
          seed={participant.id.charCodeAt(0)}
        />
      );
    }
    return (
      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center">
        <Users className="h-6 w-6 text-white" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No conversations yet</p>
        <p className="text-xs mt-1">Start a new chat to begin messaging</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map(conversation => (
        <div
          key={conversation.id}
          onClick={() => onSelectConversation(conversation)}
          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          {getConversationAvatar(conversation)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-neutral-900 truncate">
                {getConversationName(conversation)}
              </h3>
              {conversation.last_message_at && (
                <span className="text-xs text-neutral-500">
                  {new Date(conversation.last_message_at).toLocaleDateString()}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {conversation.is_group && (
                <Users className="h-3 w-3 text-neutral-400" />
              )}
              <p className="text-sm text-neutral-600 truncate">
                {getLastMessagePreview(conversation)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}