import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Filter } from 'lucide-react';
import { EventUI, fetchEvents } from '../../services/events/service';
import { supabase } from '../../lib/supabase';
import EventCard from './EventCard';
import { btnBase, cardBase } from '../UI';

export default function EventsScreen() {
  const [events, setEvents] = useState<EventUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchEvents();
      setEvents(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!currentUserId) return;
    
    try {
      const { error } = await supabase
        .from('event_attendees')
        .insert({ event_id: eventId, user_id: currentUserId });
      
      if (error) throw error;
      
      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, attendees: [...event.attendees, currentUserId] }
          : event
      ));
    } catch (error) {
      console.error('Failed to join event:', error);
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!currentUserId) return;
    
    try {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', currentUserId);
      
      if (error) throw error;
      
      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, attendees: event.attendees.filter(id => id !== currentUserId) }
          : event
      ));
    } catch (error) {
      console.error('Failed to leave event:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-neutral-900">Events</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className={`${btnBase} border border-neutral-200 text-neutral-600 hover:bg-neutral-50`}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button className={`${btnBase} bg-indigo-600 text-white hover:bg-indigo-700`}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 max-w-md mx-auto">
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadEvents}
                className={`${btnBase} mt-3 bg-red-600 text-white hover:bg-red-700`}
              >
                Try Again
              </button>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No events available</p>
            <p className="text-xs mt-1">Check back later for new events</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onJoin={handleJoinEvent}
                onLeave={handleLeaveEvent}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}