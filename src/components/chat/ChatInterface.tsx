import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Calendar, MapPin, Tag } from 'lucide-react';
import { Conversation, Message } from '../../types/chat';
import { ChatService } from '../../services/chat/service';
import Avatar from '../Avatar';
import { btnBase, cx } from '../UI';

interface ChatInterfaceProps {
  conversation: Conversation;
  onBack: () => void;
}

export default function ChatInterface({ conversation, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const data = await ChatService.fetchMessagesWithEvents(conversation.id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await ChatService.sendMessage(conversation.id, newMessage.trim());
      setNewMessage('');
      // Reload messages to get the new one
      const data = await ChatService.fetchMessagesWithEvents(conversation.id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const getConversationTitle = () => {
    if (conversation.name || conversation.title) {
      return conversation.name || conversation.title;
    }
    if (conversation.is_dm && conversation.participants.length > 0) {
      return conversation.participants[0].full_name || conversation.participants[0].email;
    }
    return 'Chat';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <button
          onClick={onBack}
          className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        {conversation.is_dm && conversation.participants.length > 0 ? (
          <Avatar 
            name={conversation.participants[0].full_name || conversation.participants[0].email} 
            size={40}
            seed={conversation.participants[0].id.charCodeAt(0)}
          />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {getConversationTitle().charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-neutral-900 truncate">
            {getConversationTitle()}
          </h2>
          <p className="text-xs text-neutral-500">
            {conversation.is_group ? 
              `${conversation.participants.length} members` : 
              'Direct message'
            }
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <p>No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} className="flex gap-3">
              <Avatar 
                name="User" 
                size={32}
                seed={message.sender_id.charCodeAt(0)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-neutral-900">
                    {/* In a real app, you'd fetch sender details */}
                    User
                  </span>
                  <span className="text-xs text-neutral-500">
                    {new Date(message.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                
                {message.shared_event ? (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 max-w-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm font-medium text-indigo-900">Shared Event</span>
                    </div>
                    <h4 className="font-semibold text-neutral-900 mb-2">
                      {message.shared_event.title}
                    </h4>
                    <div className="space-y-1 text-xs text-neutral-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{message.shared_event.time}</span>
                      </div>
                      {message.shared_event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{message.shared_event.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        <span className="text-xs">{message.shared_event.tags.slice(0, 2).join(', ')}</span>
                      </div>
                      <button className="text-indigo-600 hover:text-indigo-700 font-medium">
                        View Event
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-100 rounded-2xl px-3 py-2 max-w-sm">
                    <p className="text-sm text-neutral-900">{message.text}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-neutral-200 bg-white/80 backdrop-blur">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-neutral-200 rounded-2xl text-sm outline-none focus:border-indigo-400"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className={cx(
              btnBase,
              "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
              "px-3"
            )}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}