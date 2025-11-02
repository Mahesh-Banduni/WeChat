import MessageBubble from './MessageBubble';

export default function MessageGroup({ dateLabel, messages, currentUser, selectedUser }) {
  return (
    <div>
      {/* Date Separator */}
      <div className="flex justify-center my-4">
        <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">
          {dateLabel}
        </span>
      </div>

      {/* Messages */}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.messageId}
          message={msg}
          currentUser={currentUser}
          selectedUser={selectedUser}
        />
      ))}
    </div>
  );
}