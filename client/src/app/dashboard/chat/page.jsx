"use client";

import useAuth from '@/hooks/useAuth';
import useChat from '@/hooks/useChat';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageArea from '@/components/chat/MessageArea';
import MessageInput from '@/components/chat/MessageInput';

export default function ChatPage() {
  const { user } = useAuth();
  const {
    isLoadingContacts,
    latestMessages,
    messages,
    newMessage,
    selectedUser,
    isLoadingMessages,
    isSending,
    showChat,
    typingUsers,
    onlineStatus,
    messagesEndRef,
    setNewMessage,
    handleSelectUser,
    handleBackToContacts,
    handleSendMessage,
    handleFileMessage,
    handleSendMessageAndFiles
  } = useChat(user);

  if (!user) return null;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <ChatSidebar
        latestMessages={latestMessages}
        isLoadingContacts={isLoadingContacts}
        selectedUser={selectedUser}
        onlineStatus={onlineStatus}
        typingUsers={typingUsers}
        onSelectUser={handleSelectUser}
        showChat={showChat}
        user={user}
      />

      {/* Main Chat Area */}
      <div className={`
        flex-1 flex flex-col h-[calc(100vh-65px)]
        md:ml-80
        ${showChat ? 'block' : 'hidden md:flex'}
      `}>
        {/* Header */}
        <ChatHeader
          selectedUser={selectedUser}
          onlineStatus={onlineStatus}
          typingUsers={typingUsers}
          latestMessages={latestMessages}
          onBackToContacts={handleBackToContacts}
        />
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <MessageArea
            selectedUser={selectedUser}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            user={user}
            messagesEndRef={messagesEndRef}
          />
        </div>
      
        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4 sticky bottom-0">
          <MessageInput
            selectedUser={selectedUser}
            newMessage={newMessage}
            onMessageChange={setNewMessage}
            onSendMessage={handleSendMessageAndFiles}
            onFileMessage={handleFileMessage}
            isSending={isSending}
          />
        </div>
      </div>
    </div>
  );
}
