'use client';

import { getUid } from '@/services';
import { useStore } from '@/store';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Textarea } from '@workspace/ui/components/textarea';
import { cn } from '@workspace/ui/lib/utils';
import { Headset, MessageCircle, Send, Star } from 'lucide-react';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

// --- Types ---

interface TicketMessage {
  id: string;
  ticketId: string;
  sender: string;
  content: string;
  type: string;
  feishuMsgId: string | null;
  createdAt: string;
}

type TicketStatus = 'open' | 'processing' | 'resolved' | 'closed' | 'rated';

interface Ticket {
  id: string;
  ticketId: string;
  feishuThreadId: string | null;
  userId: string;
  status: TicketStatus;
  ownerOpenId: string | null;
  satisfactionScore: number | null;
  satisfactionComment: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

// --- Helpers ---

const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; variant: 'warning' | 'info' | 'success' | 'secondary' }
> = {
  open: { label: '待处理', variant: 'warning' },
  processing: { label: '处理中', variant: 'info' },
  resolved: { label: '已解决', variant: 'success' },
  closed: { label: '已关闭', variant: 'secondary' },
  rated: { label: '已评价', variant: 'success' },
};

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// --- Page Component ---

export default observer(function WorksOrderPage() {
  const { userProfile } = useStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [showRating, setShowRating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  // SSE & Polling Hybrid
  useEffect(() => {
    const uid = getUid();
    if (!uid) return;

    fetchLatestTicket();

    const interval = setInterval(fetchLatestTicket, 10000);

    const eventSource = new EventSource(`/api/tickets/stream?userId=${uid}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update') {
        fetchLatestTicket();
      }
    };

    eventSource.onerror = () => {
      // EventSource automatically retries
    };

    return () => {
      clearInterval(interval);
      eventSource.close();
    };
  }, [userProfile]);

  const fetchLatestTicket = async () => {
    const uid = getUid();
    if (!uid) return;
    try {
      const res = await fetch(`/api/tickets/latest?userId=${uid}`);
      const data = await res.json();
      if (data.ticket) {
        setTicket(data.ticket);
        if (data.ticket.status === 'resolved' && !data.ticket.satisfactionScore) {
          setShowRating(true);
        }
      } else {
        setTicket(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const uid = getUid();
    setSending(true);

    try {
      if (!ticket || !['open', 'processing'].includes(ticket.status)) {
        // Create new ticket
        toast.loading('创建工单...');
        const res = await fetch('/api/tickets/create', {
          method: 'POST',
          body: JSON.stringify({
            userId: uid,
            content: input,
            userName: userProfile?.nickname || userProfile?.username || 'User',
          }),
        });
        toast.dismiss();
        if (!res.ok) throw new Error(`创建失败 (${res.status})`);
        toast.success('工单已创建');
      } else {
        // Send message to active ticket
        const res = await fetch('/api/tickets/message', {
          method: 'POST',
          body: JSON.stringify({
            ticketId: ticket.id,
            content: input,
            sender: 'user',
          }),
        });
        if (!res.ok) throw new Error(`发送失败 (${res.status})`);
      }
      setInput('');
      fetchLatestTicket();
    } catch (err) {
      toast.dismiss();
      toast.error(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleRate = async () => {
    if (!ticket || rating === 0) return;
    try {
      const res = await fetch('/api/tickets/rate', {
        method: 'POST',
        body: JSON.stringify({
          ticketId: ticket.id,
          score: rating,
          comment: ratingComment,
        }),
      });
      if (!res.ok) throw new Error(`提交失败 (${res.status})`);
      setShowRating(false);
      setRating(0);
      setRatingComment('');
      toast.success('感谢您的评价');
      fetchLatestTicket();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交失败');
    }
  };

  // --- Derived State ---
  const isActive = ticket != null && ['open', 'processing'].includes(ticket.status);
  const isResolved = ticket?.status === 'resolved';
  const isFinished = ticket != null && ['resolved', 'closed', 'rated'].includes(ticket.status);

  // --- Loading Skeleton ---
  if (loading) {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <div className="border-b px-4 py-3">
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          <div className="h-3 w-20 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'bg-muted animate-pulse rounded-lg',
                  i === 1 ? 'h-12 w-56' : i === 2 ? 'h-10 w-40' : 'h-14 w-52'
                )}
              />
            </div>
          ))}
        </div>
        <div className="border-t p-3">
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* ===== Header ===== */}
      {ticket ? (
        <div className="border-b bg-background px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Headset className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate">工单 {ticket.ticketId}</span>
          </div>
          <Badge variant={STATUS_CONFIG[ticket.status].variant}>
            {STATUS_CONFIG[ticket.status].label}
          </Badge>
        </div>
      ) : (
        <div className="border-b bg-background px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">客服中心</span>
          </div>
        </div>
      )}

      {/* ===== Content Area ===== */}
      <div className="flex-1 overflow-y-auto">
        {!ticket ? (
          /* --- Empty State / Welcome --- */
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">有什么可以帮您？</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              请在下方输入您的问题，我们的客服团队会尽快为您处理。
            </p>
          </div>
        ) : (
          /* --- Message List --- */
          <div className="p-4 space-y-3">
            {ticket.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.sender === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2',
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-btn rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  )}
                >
                  {msg.sender === 'support' && (
                    <div className="text-xs font-medium text-muted-foreground mb-1">客服</div>
                  )}
                  <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                  <div
                    className={cn(
                      'text-[10px] mt-1 text-right',
                      msg.sender === 'user' ? 'text-primary-btn/70' : 'text-muted-foreground/70'
                    )}
                  >
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            ))}

            {/* --- Rating Panel (inline after messages) --- */}
            {showRating && isResolved && (
              <div className="bg-muted/50 rounded-lg p-4 mt-4 border">
                <div className="text-sm font-medium text-center mb-3">
                  工单已解决，请为本次服务评分
                </div>
                <div className="flex justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          'h-7 w-7 transition-colors',
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/40'
                        )}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="补充评价（可选）"
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  className="mb-3 text-sm"
                  rows={2}
                />
                <Button onClick={handleRate} disabled={rating === 0} className="w-full" size="sm">
                  提交评价
                </Button>
              </div>
            )}

            {/* --- Finished hint --- */}
            {isFinished && !showRating && (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">
                  {ticket.status === 'rated'
                    ? `已评价 ${'⭐'.repeat(ticket.satisfactionScore ?? 0)}`
                    : '工单已结束'}
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ===== Input Bar ===== */}
      <div className="border-t bg-background p-3 shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isActive
                ? '输入消息...'
                : ticket && isFinished
                  ? '输入新问题，发起新工单...'
                  : '描述您遇到的问题...'
            }
            className="text-sm min-h-[40px] max-h-[120px] resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});
