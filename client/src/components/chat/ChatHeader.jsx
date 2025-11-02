import { ArrowLeft, MessageSquare } from 'lucide-react';

export default function ChatHeader({
  selectedUser,
  onlineStatus,
  typingUsers,
  latestMessages,
  onBackToContacts
}) {
  return (
    <div className="bg-white border-b border-gray-200 p-4 sticky top-0">
      {selectedUser ? (
        <div className="flex items-center space-x-4">
          {/* Back button for mobile */}
          <button
            onClick={onBackToContacts}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
              {selectedUser.name.charAt(0)}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${
              onlineStatus[selectedUser.userId]?.status === 'online' 
                ? 'bg-green-400' 
                : 'bg-gray-400'
            }`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {selectedUser.name}
              </h2>
              {typingUsers[selectedUser.userId] && (
                <span className="ml-2 text-xs text-gray-500">is typing...</span>
              )}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {onlineStatus[selectedUser.userId]?.status === 'online' 
                ? 'Online' 
                : `Last seen recently`}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
            <p className="text-sm text-gray-500">
              {latestMessages.length} contacts available
            </p>
          </div>
        </div>
      )}
    </div>
  );
}