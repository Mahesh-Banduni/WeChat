"use client";

import { useState } from 'react';
import { Users } from 'lucide-react';
import ContactItem from './ContactItem';
import SearchBar from './SearchBar';

export default function ChatSidebar({
  latestMessages,
  isLoadingContacts,
  selectedUser,
  onlineStatus,
  typingUsers,
  onSelectUser,
  showChat,
  user
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMessages = latestMessages.filter(item =>
    item.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`
      w-full md:w-80 border-r border-gray-200 bg-white overflow-y-auto h-[calc(100vh-65px)]
      md:block md:fixed
      ${showChat ? 'hidden md:block' : 'block'}
    `}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Chats</h1>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        
      {/* Contacts List */}
      <div className="divide-y divide-gray-100">
        {isLoadingContacts ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredMessages.length > 0 ? (
          filteredMessages.map((item) => (
            <ContactItem
              key={item.user.userId}
              item={item}
              selectedUser={selectedUser}
              onlineStatus={onlineStatus}
              typingUsers={typingUsers}
              onSelectUser={onSelectUser}
              currentUserId={user.userId}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {searchQuery ? 'No contacts found' : 'No conversations yet'}
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              {searchQuery 
                ? 'Try searching with a different name'
                : 'Your conversations will appear here once you start messaging.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}