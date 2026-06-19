'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Bell, Send, History, AlertCircle, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type BroadcastTarget = 'all' | 'students' | 'teachers';
type BroadcastPriority = 'normal' | 'high' | 'urgent';

interface BroadcastHistory {
  id: string;
  title: string;
  message: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<BroadcastTarget>('all');
  const [priority, setPriority] = useState<BroadcastPriority>('normal');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load recent system_announcement notifications for history
  useEffect(() => {
    supabase
      .from('notifications')
      .select('id, title, message, created_at, metadata')
      .eq('type', 'system_announcement')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error) setHistory((data as BroadcastHistory[]) || []);
        setHistoryLoading(false);
      });
  }, [sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || sending) return;

    setSending(true);
    setFeedback(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

      if (!supabaseUrl) throw new Error('Supabase URL not configured');

      // Call the create-notification Edge Function via fetch
      // Service key is available as an env var for admin server actions;
      // in client context we call via the anon key but the function must be public
      // or called from a Next.js Server Action. Here we use the anon client which
      // invokes the function with the user's JWT (function validates admin role internally).
      const response = await fetch(`${supabaseUrl}/functions/v1/create-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          broadcast: { target },
          type: 'system_announcement',
          title: title.trim(),
          message: message.trim(),
          priority,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Broadcast failed');
      }

      setFeedback({ ok: true, text: `Sent to ${data.sent_count ?? 'all'} users successfully.` });
      setTitle('');
      setMessage('');
    } catch (err) {
      setFeedback({ ok: false, text: err instanceof Error ? err.message : 'Failed to send broadcast' });
    } finally {
      setSending(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const targetOptions: { value: BroadcastTarget; label: string }[] = [
    { value: 'all', label: 'All Users' },
    { value: 'students', label: 'Students Only' },
    { value: 'teachers', label: 'Teachers Only' },
  ];

  const priorityOptions: { value: BroadcastPriority; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bell className="w-7 h-7 text-accent-primary" />
        <div>
          <h1 className="text-2xl font-bold text-text-primary">System Broadcast</h1>
          <p className="text-sm text-text-muted">Send a notification to all users or a specific role segment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Broadcast Form */}
        <Card className="bg-bg-elevated border-border-default">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Send className="w-5 h-5" />
              Compose Broadcast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification title"
                  maxLength={120}
                  required
                  className="w-full px-3 py-2 bg-bg-surface border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
              </div>

              {/* Message */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Notification message"
                  rows={4}
                  maxLength={500}
                  required
                  className="w-full px-3 py-2 bg-bg-surface border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                />
                <p className="text-xs text-text-muted text-right">{message.length}/500</p>
              </div>

              {/* Target */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">Target Audience</label>
                <div className="flex gap-2 flex-wrap">
                  {targetOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTarget(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        target === opt.value
                          ? 'bg-accent-primary text-white border-accent-primary'
                          : 'border-border-default text-text-secondary hover:border-accent-primary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">Priority</label>
                <div className="flex gap-2 flex-wrap">
                  {priorityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        priority === opt.value
                          ? 'bg-accent-primary text-white border-accent-primary'
                          : 'border-border-default text-text-secondary hover:border-accent-primary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              {feedback && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    feedback.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {feedback.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {feedback.text}
                </div>
              )}

              <Button
                type="submit"
                disabled={sending || !title.trim() || !message.trim()}
                className="w-full gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending…' : `Send to ${targetOptions.find((o) => o.value === target)?.label}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Broadcast History */}
        <Card className="bg-bg-elevated border-border-default">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Broadcasts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-bg-surface animate-pulse rounded-lg" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-text-muted">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No broadcasts sent yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="p-3 bg-bg-surface rounded-lg space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary text-sm truncate">{item.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {formatDate(item.created_at)}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-2">{item.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
