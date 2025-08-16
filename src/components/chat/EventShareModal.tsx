import React, { useState, useEffect } from 'react';
import { Share2, X, Send } from 'lucide-react';
import { Conversation } from '../../types/chat';
import { ChatService } from '../../services/chat/service';
import Avatar from '../Avatar';
import { btnBase, cardBase, cx } from '../UI';

interface EventShareModalProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
  onShare: (conversationId: string) => void;
}

export default function EventShareModal({ eventId, eventTitle, onClose, onShare }: EventShareModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await ChatService.fetchConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (conversationId: string) => {
    setSharing(conversationId);
    try {
      await ChatService.shareEvent(conversationId, eventId);
      onShare(conversationId);
    } catch (error) {
      console.error('Failed to share event:', error);
    } finally {
      setSharing(null);
    }
  };

  const getConversationName = (conversation: Conversation) => {
    if (conversation.name || conversation.title) {
      return conversation.name || conversation.title;
    }
    if (conversation.is_dm && conversation.participants.length > 0) {
      return conversation.participants[0].full_name || conversation.participants[0].email;
    }
    return 'Unknown Conversation';
  };

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.is_dm && conversation.participants.length > 0) {
      const participant = conversation.participants[0];
      return (
        <Avatar 
          name={participant.full_name || participant.email} 
          size={40}
          seed={participant.id.charCodeAt(0)}
        />
      );
    }
    return (
      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center">
        <Share2 className="h-5 w-5 text-white" />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`${cardBase} w-full max-w-md max-h-[70vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Share Event</h2>
            <p className="text-sm text-neutral-600 truncate">{eventTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <Share2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No conversations available</p>
              <p className="text-xs mt-1">Start a chat first to share events</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(conversation => (
                <div
                  key={conversation.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-transparent hover:bg-neutral-50 transition-colors"
                >
                  {getConversationAvatar(conversation)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 truncate">
                      {getConversationName(conversation)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {conversation.is_group ? 
                        `${conversation.participants.length} members` : 
                        'Direct message'
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => handleShare(conversation.id)}
                    disabled={sharing === conversation.id}
                    className={cx(
                      btnBase,
                      "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
                      "px-3 py-1"
                    )}
                  >
                    {sharing === conversation.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}