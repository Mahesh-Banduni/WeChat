// components/Chatbot.jsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, MessageCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi there! 👋 I'm WeChat Assistant. How can I help you with WeChat today?",
      sender: 'model',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const toggleSources = (messageId) => {
    setExpandedSources(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const accessToken = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
           ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({ query: inputText.trim(), context: messages}),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Extract the nested response data
      const responseData = data.response || data;
      
      const botMessage = {
        id: Date.now() + 1,
        text: responseData.response || "I'm sorry, I couldn't process your request. Please try again.",
        sender: 'model',
        timestamp: new Date(),
        sources: responseData.sources,
        confidence: responseData.confidence,
        metadata: responseData.metadata,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I'm experiencing technical difficulties. Please try again in a moment.",
        sender: 'model',
        timestamp: new Date(),
        isError: true,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "Hi there! 👋 I'm WeChat Assistant. How can I help you with WeChat today?",
        sender: 'model',
        timestamp: new Date(),
      },
    ]);
    setExpandedSources({});
  };

//   const formatConfidence = (confidence) => {
//     if (confidence >= 80) return 'high';
//     if (confidence >= 60) return 'medium';
//     return 'low';
//   };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-50"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end"
          onClick={() => setIsOpen(false)} // click on overlay closes
        >
        <div className="
          fixed bottom-0 right-0 
          w-full h-full 
          sm:bottom-4 sm:right-4 sm:w-[90%] sm:h-[80%] 
          md:w-[420px] md:h-[600px] 
          bg-white rounded-none sm:rounded-2xl 
          shadow-2xl flex flex-col border border-gray-200 
          z-50 animate-in slide-in-from-bottom-8 duration-300
        "
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-semibold">WeChat Assistant</h3>
                <p className="text-xs text-blue-100">Powered by AI</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
             {messages.length>1 &&(
                 <button
              onClick={clearChat}
              className="p-1 flex items-center gap-1 hover:bg-white/20 rounded transition-colors"
              title="Clear chat"
            >
              <span>Clear chat</span>
                <svg
                className="w-4 h-4"
                fill="none"
                stroke="white"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
                />
              </svg>
            </button>
             )}

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Close chat"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 max-h-[calc(100vh-120px)]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : message.isError
                      ? 'bg-red-100 text-red-800 rounded-bl-none'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.sender === 'model' && !message.isError && (
                      <Bot size={16} className="mt-1 flex-shrink-0 text-blue-600" />
                    )}
                    {message.isError && (
                      <svg className="w-4 h-4 mt-1 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      
                      {/* Sources and Confidence */}
                      {/* {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-block w-3 h-3 rounded-full ${
                                formatConfidence(message.confidence) === 'high' ? 'bg-green-500' :
                                formatConfidence(message.confidence) === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              <p className="text-xs text-gray-500">
                                Confidence: {message.confidence}%
                              </p>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500">
                                Sources: {message.sources.length}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleSources(message.id)}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                            >
                              <BookOpen size={12} />
                              <span>{expandedSources[message.id] ? 'Hide' : 'Show'} sources</span>
                              {expandedSources[message.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </div>
                          
                          
                          {expandedSources[message.id] && (
                            <div className="space-y-2">
                              {message.sources.slice(0, 3).map((source, index) => (
                                <div key={source.id} className="bg-gray-50 p-2 rounded-lg">
                                  <p className="text-xs font-medium text-gray-700">
                                    {index + 1}. {source.question}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      {source.category}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {source.score}% match
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {message.sources.length > 3 && (
                                <p className="text-xs text-gray-400 text-center">
                                  +{message.sources.length - 3} more sources
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )} */}
                    </div>
                    {message.sender === 'user' && (
                      <User size={16} className="mt-1 flex-shrink-0 text-blue-200" />
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <p className="text-xs mt-1 text-gray-400 text-right">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 max-w-xs">
                  <div className="flex items-center space-x-2">
                    <Bot size={16} className="text-blue-600" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about WeChat..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-3">
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isLoading}
                    className={`p-1 rounded-full transition-colors ${
                      !inputText.trim() || isLoading
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Quick Suggestions */}
            <div className="mt-3 flex flex-wrap gap-2">
              {['What is WeChat?', 'How to create account?', 'Business features'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInputText(suggestion)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;