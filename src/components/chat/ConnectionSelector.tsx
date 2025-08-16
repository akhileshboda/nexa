import React, { useState, useEffect } from 'react';
import { Users, User, Search, X } from 'lucide-react';
import { Connection } from '../../types/chat';
import { ChatService } from '../../services/chat/service';
import Avatar from '../Avatar';
import { btnBase, cardBase, cx } from '../UI';

interface ConnectionSelectorProps {
  onStartChat: (conversationId: string) => void;
  onClose: () => void;
}

export default function ConnectionSelector({ onStartChat, onClose }: ConnectionSelectorProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const data = await ChatService.fetchConnections();
      setConnections(data);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConnections = connections.filter(conn =>
    conn.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conn.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleConnection = (connectionId: string) => {
    setSelectedConnections(prev =>
      prev.includes(connectionId)
        ? prev.filter(id => id !== connectionId)
        : [...prev, connectionId]
    );
  };

  const startDirectChat = async (connectionId: string) => {
    setCreating(true);
    try {
      const conversationId = await ChatService.createOrGetDirectConversation(connectionId);
      onStartChat(conversationId);
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      setCreating(false);
    }
  };

  const startGroupChat = async () => {
    if (selectedConnections.length === 0) return;
    
    setCreating(true);
    try {
      const name = groupName.trim() || `Group with ${selectedConnections.length} members`;
      const conversationId = await ChatService.createGroupConversation(selectedConnections, name);
      onStartChat(conversationId);
    } catch (error) {
      console.error('Failed to create group chat:', error);
    } finally {
      setCreating(false);
    }
  };

  const isGroupMode = selectedConnections.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`${cardBase} w-full max-w-md max-h-[80vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isGroupMode ? 'Create Group Chat' : 'Start New Chat'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search connections..."
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-2xl text-sm outline-none focus:border-indigo-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Group Name Input (when in group mode) */}
        {isGroupMode && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Group name (optional)"
              className="w-full px-4 py-2 border border-neutral-200 rounded-2xl text-sm outline-none focus:border-indigo-400"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
        )}

        {/* Selected Connections */}
        {selectedConnections.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {selectedConnections.map(id => {
                const connection = connections.find(c => c.id === id);
                return connection ? (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs"
                  >
                    {connection.full_name}
                    <button
                      onClick={() => toggleConnection(id)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Connections List */}
        <div className="flex-1 overflow-y-auto mb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No connections found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConnections.map(connection => (
                <div
                  key={connection.id}
                  className={cx(
                    "flex items-center gap-3 p-3 rounded-2xl border transition-colors cursor-pointer",
                    selectedConnections.includes(connection.id)
                      ? "bg-indigo-50 border-indigo-200"
                      : "hover:bg-neutral-50 border-transparent"
                  )}
                  onClick={() => {
                    if (isGroupMode) {
                      toggleConnection(connection.id);
                    } else {
                      startDirectChat(connection.id);
                    }
                  }}
                >
                  <Avatar 
                    name={connection.full_name || connection.email} 
                    size={40}
                    seed={connection.id.charCodeAt(0)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 truncate">
                      {connection.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {connection.email}
                    </p>
                  </div>
                  {isGroupMode && (
                    <div className={cx(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      selectedConnections.includes(connection.id)
                        ? "bg-indigo-600 border-indigo-600"
                        : "border-neutral-300"
                    )}>
                      {selectedConnections.includes(connection.id) && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isGroupMode ? (
            <button
              onClick={() => setSelectedConnections([])}
              className={`${btnBase} flex-1 border border-indigo-200 text-indigo-600 hover:bg-indigo-50`}
            >
              <Users className="h-4 w-4 mr-2" />
              Create Group
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setSelectedConnections([]);
                  setGroupName('');
                }}
                className={`${btnBase} flex-1 border border-neutral-200 text-neutral-600 hover:bg-neutral-50`}
              >
                Cancel
              </button>
              <button
                onClick={startGroupChat}
                disabled={selectedConnections.length === 0 || creating}
                className={`${btnBase} flex-1 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Create Group
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}