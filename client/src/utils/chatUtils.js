import { format, isToday, isYesterday } from 'date-fns';

export const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    console.error('Invalid date:', dateString);
    return '';
  }
};

export const getMessageStatusIcon = (message, currentUserId) => {
  if (message.senderId !== currentUserId) return null;
  
  switch (message.status) {
    case 'SENDING':
      return <span className="text-[75%] opacity-50">⏳</span>;
    case 'SENT':
      return <span className="text-[75%]">✓</span>;
    case 'DELIVERED':
      return <span className="text-[75%]">✓✓</span>;
    case 'READ':
      return <span className="text-[75%] text-blue-200">✓✓</span>;
    default:
      return <span className="text-[75%]">✓</span>;
  }
};

export const groupMessagesByDate = (messages) => {
  if (!Array.isArray(messages)) {
    messages = Object.values(messages);
  }

  const groups = {};

  messages.forEach((msg) => {
    try {
      // Sanitize nested message in numeric key (e.g., msg[0])
      if (typeof msg === 'object' && msg !== null && msg[0]) {
        msg = msg[0];
      }

      const date = new Date(msg.createdAt);
      if (isNaN(date.getTime())) throw new Error('Invalid Date');

      let key;

      if (isToday(date)) {
        key = 'Today';
      } else if (isYesterday(date)) {
        key = 'Yesterday';
      } else {
        key = format(date, 'dd MMM yyyy');
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(msg);
    } catch (err) {
      console.error('Skipping invalid message:', msg, err.message);
    }
  });

  return groups;
};