import { formatDate, getMessageStatusIcon } from '@/utils/chatUtils';

export default function ContactItem({
  item,
  selectedUser,
  onlineStatus,
  typingUsers,
  onSelectUser,
  currentUserId
}) {
  return (
    <div
      className={`relative px-4 py-3 cursor-pointer transition-all duration-300 hover:bg-gray-50 active:bg-gray-100 ${
        selectedUser?.userId === item.user.userId 
          ? 'bg-blue-50 border-l-3 border-blue-500 border-b-0' 
          : ''
      }`}
      onClick={() => onSelectUser(item)}
    >
      <div className="flex items-start space-x-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-base shadow-sm">
            {item.user.name.charAt(0).toUpperCase()}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full ${
            onlineStatus[item.user.userId]?.status === 'online' 
              ? 'bg-green-400' 
              : 'bg-gray-400'
          }`}></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 truncate text-base">
              {item.user.name}
            </h3>
            {item.latestMessage?.createdAt && (
              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                {formatDate(item.latestMessage.createdAt)}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <p className="text-sm text-gray-600 truncate">
                {typingUsers[item.user.userId] 
                  ? 'typing...' 
                  : `${item.latestMessage
                      ? item.latestMessage.type === 'TEXT'
                        ? item.latestMessage.content
                        : item.latestMessage.type === 'VIDEO'
                        ? 'Video'
                        : item.latestMessage.type === 'IMAGE'
                        ? 'Photo'
                        : 'File'
                      : 'Click to start chatting...'}`}
              </p>
              {item.latestMessage?.senderId === currentUserId && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {getMessageStatusIcon(item.latestMessage, currentUserId)}
                </span>
              )}
            </div>
            {item.unreadCount > 0 && (
              <div className="flex-shrink-0 ml-2">
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-500 rounded-full">
                  {item.unreadCount}
                </span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {onlineStatus[item.user.userId]?.status === 'online' 
              ? 'Online' 
              : `Last seen recently`}
          </div>
        </div>
      </div>
    </div>
  );
}