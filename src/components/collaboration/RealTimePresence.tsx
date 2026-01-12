import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MessageSquare, 
  AtSign,
  Send,
  X,
  MoreHorizontal,
  Edit3,
  Trash2,
  Reply,
  Check,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ============================================
// MELHORIA: Real-time Presence Indicators
// Indicadores de presença em tempo real
// ============================================

interface User {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number };
  lastSeen?: Date;
  status?: 'online' | 'away' | 'busy';
}

interface RealTimePresenceProps {
  users: User[];
  currentUserId: string;
  maxVisible?: number;
  showCursors?: boolean;
  onUserClick?: (user: User) => void;
}

export const RealTimePresence: React.FC<RealTimePresenceProps> = ({
  users,
  currentUserId,
  maxVisible = 5,
  showCursors = false,
  onUserClick
}) => {
  const otherUsers = users.filter(u => u.id !== currentUserId);
  const visibleUsers = otherUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, otherUsers.length - maxVisible);

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500'
  };

  return (
    <div className="relative">
      {/* User avatars */}
      <div className="flex items-center -space-x-2">
        {visibleUsers.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ scale: 0, x: -20 }}
            animate={{ scale: 1, x: 0 }}
            exit={{ scale: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
          >
            <button
              onClick={() => onUserClick?.(user)}
              className="block focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
            >
              <Avatar 
                className="w-8 h-8 border-2 border-background"
                style={{ borderColor: user.color }}
              >
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback style={{ backgroundColor: user.color }}>
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Status indicator */}
              <span 
                className={cn(
                  "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background",
                  statusColors[user.status || 'online']
                )}
              />
            </button>
          </motion.div>
        ))}

        {/* Hidden users count */}
        {hiddenCount > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium hover:bg-muted/80 transition-colors">
                +{hiddenCount}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="space-y-1">
                {otherUsers.slice(maxVisible).map(user => (
                  <button
                    key={user.id}
                    onClick={() => onUserClick?.(user)}
                    className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback style={{ backgroundColor: user.color }}>
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{user.name}</span>
                    <span 
                      className={cn(
                        "w-2 h-2 rounded-full ml-auto",
                        statusColors[user.status || 'online']
                      )}
                    />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Live cursors overlay */}
      {showCursors && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <AnimatePresence>
            {otherUsers.filter(u => u.cursor).map(user => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  x: user.cursor!.x,
                  y: user.cursor!.y 
                }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
                className="absolute"
                style={{ left: 0, top: 0 }}
              >
                {/* Cursor */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ color: user.color }}
                >
                  <path
                    d="M5.65 2.1L19.85 12.6C20.45 13.05 20.2 14 19.45 14.1L12.35 15L9.25 21.5C8.95 22.1 8.05 22.05 7.8 21.4L2.25 3.65C2 2.95 2.75 2.35 3.4 2.65L5.65 2.1Z"
                    fill="currentColor"
                  />
                </svg>
                {/* Name label */}
                <span 
                  className="absolute left-4 top-5 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// ============================================
// MELHORIA: Comments & Mentions System
// Sistema de comentários com menções
// ============================================

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  mentions?: string[];
  replies?: Comment[];
  resolved?: boolean;
  entityType?: string;
  entityId?: string;
}

interface CommentsSystemProps {
  comments: Comment[];
  currentUserId: string;
  users: { id: string; name: string; avatar?: string }[];
  onAddComment: (content: string, mentions: string[], parentId?: string) => void;
  onEditComment: (id: string, content: string) => void;
  onDeleteComment: (id: string) => void;
  onResolveComment: (id: string) => void;
  entityType?: string;
  entityId?: string;
}

export const CommentsSystem: React.FC<CommentsSystemProps> = ({
  comments,
  currentUserId,
  users,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onResolveComment,
  entityType,
  entityId
}) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);

  const filteredUsers = useMemo(() => 
    users.filter(u => 
      u.id !== currentUserId && 
      u.name.toLowerCase().includes(mentionSearch.toLowerCase())
    ),
    [users, currentUserId, mentionSearch]
  );

  const handleInputChange = (value: string, isEdit = false) => {
    const setter = isEdit ? setEditContent : setNewComment;
    setter(value);

    // Check for @ mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      const hasSpace = textAfterAt.includes(' ');
      
      if (!hasSpace) {
        setShowMentions(true);
        setMentionSearch(textAfterAt);
        setMentionPosition(lastAtIndex);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: { id: string; name: string }, isEdit = false) => {
    const currentValue = isEdit ? editContent : newComment;
    const beforeMention = currentValue.slice(0, mentionPosition);
    const afterMention = currentValue.slice(mentionPosition + mentionSearch.length + 1);
    const newValue = `${beforeMention}@${user.name} ${afterMention}`;
    
    if (isEdit) {
      setEditContent(newValue);
    } else {
      setNewComment(newValue);
    }
    setShowMentions(false);
  };

  const extractMentions = (content: string): string[] => {
    const mentions: string[] = [];
    const regex = /@(\w+)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const user = users.find(u => u.name.toLowerCase() === match[1].toLowerCase());
      if (user) mentions.push(user.id);
    }
    
    return mentions;
  };

  const handleSubmit = (parentId?: string) => {
    const content = parentId ? newComment : newComment;
    if (!content.trim()) return;
    
    const mentions = extractMentions(content);
    onAddComment(content, mentions, parentId);
    setNewComment('');
    setReplyingTo(null);
  };

  const handleEdit = (id: string) => {
    if (!editContent.trim()) return;
    onEditComment(id, editContent);
    setEditingId(null);
    setEditContent('');
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <motion.div
      key={comment.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group",
        isReply && "ml-8 mt-3",
        comment.resolved && "opacity-60"
      )}
    >
      <div className={cn(
        "p-3 rounded-lg",
        comment.resolved ? "bg-muted/50" : "bg-muted"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={comment.author.avatar} />
              <AvatarFallback>
                {comment.author.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(comment.createdAt)}
            </span>
            {comment.resolved && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Resolvido
              </span>
            )}
          </div>

          {/* Actions */}
          {comment.author.id === currentUserId && !comment.resolved && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setEditingId(comment.id);
                  setEditContent(comment.content);
                }}
              >
                <Edit3 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => onDeleteComment(comment.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {editingId === comment.id ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => handleInputChange(e.target.value, true)}
              className="min-h-[60px] text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleEdit(comment.id)}>
                Salvar
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setEditingId(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">
            {comment.content.split(/(@\w+)/g).map((part, i) => 
              part.startsWith('@') ? (
                <span key={i} className="text-primary font-medium">
                  {part}
                </span>
              ) : part
            )}
          </p>
        )}

        {/* Actions bar */}
        {!comment.resolved && !isReply && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setReplyingTo(comment.id)}
            >
              <Reply className="w-3 h-3" />
              Responder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onResolveComment(comment.id)}
            >
              <Check className="w-3 h-3" />
              Resolver
            </Button>
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies?.map(reply => renderComment(reply, true))}

      {/* Reply input */}
      {replyingTo === comment.id && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="ml-8 mt-2"
        >
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Escreva uma resposta..."
              className="min-h-[60px] text-sm flex-1"
            />
            <div className="flex flex-col gap-1">
              <Button size="icon" onClick={() => handleSubmit(comment.id)}>
                <Send className="w-4 h-4" />
              </Button>
              <Button 
                size="icon" 
                variant="outline"
                onClick={() => setReplyingTo(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-4">
      {/* Comments header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Comentários ({comments.length})
        </h3>
      </div>

      {/* New comment input */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Textarea
              value={newComment}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Adicione um comentário... Use @ para mencionar"
              className="min-h-[80px] text-sm pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6"
              onClick={() => setShowMentions(!showMentions)}
            >
              <AtSign className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            onClick={() => handleSubmit()}
            disabled={!newComment.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Mentions dropdown */}
        <AnimatePresence>
          {showMentions && filteredUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-12 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto"
            >
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => insertMention(user)}
                  className="flex items-center gap-2 w-full p-2 hover:bg-muted transition-colors text-left"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Comments list */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
};

// ============================================
// Activity Indicator
// Indicador de atividade em tempo real
// ============================================

interface Activity {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  action: string;
  target?: string;
  timestamp: Date;
}

interface ActivityIndicatorProps {
  activities: Activity[];
  maxVisible?: number;
}

export const ActivityIndicator: React.FC<ActivityIndicatorProps> = ({
  activities,
  maxVisible = 3
}) => {
  const recentActivities = activities.slice(0, maxVisible);

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {recentActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-2 text-sm"
          >
            <Avatar className="w-5 h-5">
              <AvatarImage src={activity.user.avatar} />
              <AvatarFallback className="text-[10px]">
                {activity.user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground">
              <strong className="text-foreground">{activity.user.name}</strong>
              {' '}{activity.action}{' '}
              {activity.target && (
                <strong className="text-foreground">{activity.target}</strong>
              )}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// Collaborative Editing Lock
// Indicador de edição colaborativa
// ============================================

interface EditLockProps {
  isLocked: boolean;
  lockedBy?: {
    name: string;
    avatar?: string;
  };
  onRequestAccess?: () => void;
}

export const EditLock: React.FC<EditLockProps> = ({
  isLocked,
  lockedBy,
  onRequestAccess
}) => {
  if (!isLocked) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
    >
      <Edit3 className="w-5 h-5 text-amber-500" />
      <div className="flex-1">
        <p className="text-sm font-medium">
          {lockedBy?.name} está editando
        </p>
        <p className="text-xs text-muted-foreground">
          Aguarde a conclusão ou solicite acesso
        </p>
      </div>
      {onRequestAccess && (
        <Button variant="outline" size="sm" onClick={onRequestAccess}>
          Solicitar acesso
        </Button>
      )}
    </motion.div>
  );
};

export default RealTimePresence;
