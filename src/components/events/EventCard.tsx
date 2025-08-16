import React, { useState } from 'react';
import { Calendar, MapPin, Tag, Share2, Users } from 'lucide-react';
import { EventUI } from '../../services/events/service';
import EventShareModal from '../chat/EventShareModal';
import { chipBase, cx } from '../UI';

interface EventCardProps {
  event: EventUI;
  onJoin?: (eventId: string) => void;
  onLeave?: (eventId: string) => void;
  currentUserId?: string;
}

export default function EventCard({ event, onJoin, onLeave, currentUserId }: EventCardProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const isAttending = currentUserId ? event.attendees.includes(currentUserId) : false;

  const handleShare = (conversationId: string) => {
    setShowShareModal(false);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2000);
  };

  const handleJoinToggle = () => {
    if (isAttending && onLeave) {
      onLeave(event.id);
    } else if (!isAttending && onJoin) {
      onJoin(event.id);
    }
  };

  return (
    <>
      <div className="bg-white/80 backdrop-blur border border-neutral-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-900 mb-1 leading-tight">
              {event.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-neutral-600 mb-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{event.time}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Share Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className={cx(
              "p-2 rounded-full transition-colors",
              shareSuccess 
                ? "bg-green-100 text-green-600" 
                : "hover:bg-neutral-100 text-neutral-600"
            )}
            title="Share event"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {event.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className={`${chipBase} bg-indigo-50 text-indigo-700 border-indigo-200`}>
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className={`${chipBase} bg-neutral-100 text-neutral-600 border-neutral-200`}>
                +{event.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Users className="h-4 w-4" />
            <span>{event.attendees.length} attending</span>
            {event.source && (
              <>
                <span>•</span>
                <span className="text-xs">{event.source}</span>
              </>
            )}
          </div>
          
          {onJoin && onLeave && (
            <button
              onClick={handleJoinToggle}
              className={cx(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                isAttending
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              )}
            >
              {isAttending ? 'Attending' : 'Join'}
            </button>
          )}
        </div>

        {/* Share Success Indicator */}
        {shareSuccess && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-2">
            <p className="text-green-700 text-xs text-center">Event shared successfully!</p>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <EventShareModal
          eventId={event.id}
          eventTitle={event.title}
          onClose={() => setShowShareModal(false)}
          onShare={handleShare}
        />
      )}
    </>
  );
}