import { MessageSquare } from 'lucide-react';
import MessageGroup from './MessageGroup';
import { groupMessagesByDate } from '@/utils/chatUtils';

export default function MessageArea({
  selectedUser,
  messages,
  isLoadingMessages,
  user,
  messagesEndRef
}) {
  if (!selectedUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <MessageSquare className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-medium text-gray-700 mb-2">Welcome to Chat</h3>
        <p className="text-gray-500 mb-4 text-center">
          Select a contact from the sidebar to start chatting
        </p>
      </div>
    );
  }

  if (isLoadingMessages) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">No messages yet</h3>
        <p className="text-sm text-center max-w-sm">
          Start a conversation with {selectedUser.name} by sending a message below.
        </p>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="p-3 flex flex-col">
      {Object.entries(groupedMessages).map(([dateLabel, msgs]) => (
        <MessageGroup
          key={dateLabel}
          dateLabel={dateLabel}
          messages={msgs}
          currentUser={user}
          selectedUser={selectedUser}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}