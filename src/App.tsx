import React, { useState, useEffect } from 'react';
import { MessageCircle, Calendar, User, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import ChatScreen from './components/chat/ChatScreen';
import EventsScreen from './components/events/EventsScreen';
import { btnBase, cx } from './components/UI';

type Screen = 'chat' | 'events' | 'profile';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<Screen>('events');

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return !error;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    }
  };

  const handleRegister = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });
      
      if (error) throw error;
      
      // Create user profile
      if (data.user) {
        await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email,
            full_name: name
          });
      }
      
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSignIn={handleSignIn} onRegister={handleRegister} />;
  }

  const screens = [
    { id: 'events' as const, label: 'Events', icon: Calendar },
    { id: 'chat' as const, label: 'Messages', icon: MessageCircle },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-neutral-50">
      <div className="max-w-6xl mx-auto flex h-screen">
        {/* Sidebar */}
        <div className="w-64 border-r border-neutral-200 bg-white/80 backdrop-blur flex flex-col">
          {/* Logo/Header */}
          <div className="p-4 border-b border-neutral-200">
            <h1 className="text-xl font-bold text-neutral-900">Nexa</h1>
            <p className="text-sm text-neutral-600">Your University Nexus</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {screens.map(screen => {
                const Icon = screen.icon;
                return (
                  <button
                    key={screen.id}
                    onClick={() => setActiveScreen(screen.id)}
                    className={cx(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-left transition-colors",
                      activeScreen === screen.id
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-neutral-600 hover:bg-neutral-100"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {screen.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* User Info & Sign Out */}
          <div className="p-4 border-t border-neutral-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-neutral-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className={`${btnBase} w-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50`}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {activeScreen === 'events' && <EventsScreen />}
          {activeScreen === 'chat' && <ChatScreen />}
          {activeScreen === 'profile' && (
            <div className="flex-1 flex items-center justify-center">
              <div className={cardBase}>
                <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>
                <p className="text-neutral-600">Profile management coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}