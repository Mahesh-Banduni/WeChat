import { useState, useEffect } from 'react';
import { 
  Image, Video, File, Download, X, ChevronLeft, ChevronRight, 
  Play, Pause, Volume2, VolumeX, RotateCcw, Clock, Check, CheckCheck, Eye, ScanEye
} from 'lucide-react';

// Mock utility functions
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
};

const getMessageStatusIcon = (message, currentUserId) => {
  if (message.senderId !== currentUserId) return null;
  
  switch (message.status) {
    case 'SENDING':
      return <Clock className="w-3 h-3" />;
    case 'SENT':
      return <Check className="w-3 h-3" />;
    case 'DELIVERED':
      return <CheckCheck className="w-3 h-3" />;
    case 'READ':
      return <CheckCheck className="w-3 h-3 text-blue-400" />;
    default:
      return <Check className="w-3 h-3" />;
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function MessageBubble({ 
  message, 
  currentUser, 
  selectedUser,
  conversationMessages = []
}) {
  const isOwnMessage = message.senderId === currentUser.userId;
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageGallery, setImageGallery] = useState([]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleOpenImageModal = (clickedMessage) => {
  const images = conversationMessages
    .filter(m => m.type === 'IMAGE')
    .map(m => ({
      url: m.content,
      messageId: m.messageId,
      timestamp: m.createdAt,
      sender: m.senderId === currentUser.userId ? 'You' : selectedUser.name
    }));

  const initialIndex = images.findIndex(img => img.url === clickedMessage.content);
  setImageGallery(images);
  setCurrentImageIndex(initialIndex >= 0 ? initialIndex : 0);
  setShowImageModal(true);
};


  const handleCloseModal = () => {
    setShowImageModal(false);
  };

  const navigateImage = (direction) => {
    setCurrentImageIndex(prev => {
      if (direction === 'prev') {
        return prev === 0 ? imageGallery.length - 1 : prev - 1;
      } else {
        return prev === imageGallery.length - 1 ? 0 : prev + 1;
      }
    });
  };

  const handleKeyDown = (e) => {
    if (showImageModal) {
      if (e.key === 'Escape') handleCloseModal();
      if (e.key === 'ArrowLeft') navigateImage('prev');
      if (e.key === 'ArrowRight') navigateImage('next');
    }
  };

  const getFileName = (content)=>{
    const urlObj = new URL(content);
    const fullPath = urlObj.pathname;
    const fullFileName = fullPath.split('/').pop();

    // Remove the leading timestamp and hyphen
    const actualFileName = fullFileName.replace(/^\d+-/, '');
    return actualFileName;
  }

  useEffect(() => {
    if (showImageModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [showImageModal, currentImageIndex]);

  const handleDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `file_${Date.now()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return File;
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return () => <div className="w-6 h-6 bg-red-500 text-white rounded text-xs flex items-center justify-center font-bold">PDF</div>;
      case 'doc':
      case 'docx':
        return () => <div className="w-6 h-6 bg-blue-500 text-white rounded text-xs flex items-center justify-center font-bold">DOC</div>;
      case 'xls':
      case 'xlsx':
        return () => <div className="w-6 h-6 bg-green-500 text-white rounded text-xs flex items-center justify-center font-bold">XLS</div>;
      case 'ppt':
      case 'pptx':
        return () => <div className="w-6 h-6 bg-orange-500 text-white rounded text-xs flex items-center justify-center font-bold">PPT</div>;
      case 'zip':
      case 'rar':
        return () => <div className="w-6 h-6 bg-purple-500 text-white rounded text-xs flex items-center justify-center font-bold">ZIP</div>;
      default:
        return File;
    }
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'IMAGE':
        return (
          <div className="relative group">
            <img
              src={message.content}
              alt="Sent image"
              className="max-w-full w-full min-w-48 max-w-sm sm:max-w-md rounded-lg cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
              onClick={() => handleOpenImageModal(message)}
              loading="lazy"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBMMTMwIDEwMEgxMTVWMTMwSDg1VjEwMEg3MEwxMDAgNzBaIiBmaWxsPSIjOTlBM0FGIi8+CjwvZXZnPg==';
                e.target.className += ' opacity-50';
              }}
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(message.content, `image_${message.messageId}.jpg`);
                }}
                className="p-1.5 bg-black bg-opacity-60 rounded-full text-white hover:bg-opacity-80 transition-all"
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>
          </div>
        );

      case 'VIDEO':
        return (
          <div className="relative group max-w-sm sm:max-w-md">
            <div className="bg-black rounded-lg overflow-hidden">
              <video 
                className="w-full max-h-64 object-cover"
                controls
                preload="metadata"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onVolumeChange={(e) => setIsMuted(e.target.muted)}
              >
                <source src={message.content} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(message.content, `video_${message.messageId}.mp4`);
                }}
                className="p-1.5 bg-black bg-opacity-60 rounded-full text-white hover:bg-opacity-80 transition-all"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>
        );

      case 'AUDIO':
        return (
          <div className="bg-gray-50 rounded-lg p-3 min-w-64 max-w-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <audio controls className="w-full">
                  <source src={message.content} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
              <button
                onClick={() => handleDownload(message.content, `audio_${message.messageId}.mp3`)}
                className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'FILE':
        const FileIcon = getFileIcon(getFileName(message.content));
        return (
          <>
          <div
            className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors min-w-64 max-w-sm ${
              isOwnMessage 
                ? 'bg-white hover:bg-gray-100' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => window.open(message.content, '_blank')}
          >
            <div className="flex-shrink-0 mr-3">
              <FileIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate text-sm text-gray-900`}>
                {getFileName(message.content)|| 'Unknown File'}
              </p>
              <p className={`text-xs text-gray-500`}>
                {message.type}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(message.content, message.fileName);
              }}
              className={`ml-2 p-1.5 rounded transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-300`}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </>
        );

        case 'TEXT':
          default:
            const renderTextWithLinks = (text) => {
              const urlRegex = /(https?:\/\/[^\s]+)/g;
              return text.split(urlRegex).map((part, index) => {
                if (urlRegex.test(part)) {
                  return (
                    <a
                      key={index}
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline break-all"
                    >
                      {part}
                    </a>
                  );
                }
                return <span key={index}>{part}</span>;
              });
            };
          
            return (
              <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                {renderTextWithLinks(message.content)}
              </div>
            );
          }
        };

  const getAvatarInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const getAvatarColor = (name) => {
    const colors = [
      'from-red-400 to-red-600',
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-yellow-400 to-yellow-600',
      'from-teal-400 to-teal-600',
    ];
    const hash = name?.split('').reduce((a, b) => a + b.charCodeAt(0), 0) || 0;
    return colors[hash % colors.length];
  };

  return (
    <>
      {/* Message Bubble */}
      <div className={`mb-2 flex ${isOwnMessage ? 'justify-end' : 'justify-start'} px-4`}>
        <div
          className={`flex items-end space-x-2 max-w-[85%] sm:max-w-md lg:max-w-lg xl:max-w-xl ${
            isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
          }`}
        >
          {/* Avatar */}
          <div className={`w-8 h-8 bg-gradient-to-br ${getAvatarColor(isOwnMessage ? currentUser.name : selectedUser.name)} rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0`}>
            {getAvatarInitials(isOwnMessage ? currentUser.name : selectedUser.name)}
          </div>

          {/* Message Content */}
          <div className="flex flex-col space-y-1 min-w-0">
            <div
              className={`px-3 py-2 rounded-2xl shadow-sm transition-all duration-200 ${
                isOwnMessage
                  ? 'bg-gray-100 text-gray-800 rounded-br-md'
                  : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
              } ${
                message.status === 'SENDING' || message.isTemp
                  ? 'opacity-60 animate-pulse' 
                  : 'opacity-100'
              }`}
            >
              {renderMessageContent()}
              
              {/* Timestamp and Status */}
              <div
                className={`text-xs mt-1.5 flex items-center justify-between ${
                  isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                <span className="text-[10px] leading-none text-gray-500">
                  {formatDate(message.createdAt)}
                </span>
                {isOwnMessage && (
                  <span className="ml-2 flex-shrink-0">
                    {getMessageStatusIcon(message, currentUser.userId)}
                  </span>
                )}
              </div>
            </div>

            {/* Message Status for failed messages */}
            {message.status === 'FAILED' && isOwnMessage && (
              <div className="flex items-center space-x-1 text-xs text-red-500 px-1">
                <X className="w-3 h-3" />
                <span>Failed to send</span>
                <button className="text-blue-500 hover:underline ml-1">
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {showImageModal && imageGallery.length > 0 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          {/* Close Button */}
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 p-2"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative w-full max-w-6xl h-full max-h-[90vh] flex items-center justify-center">
            {/* Navigation Arrows */}
            {imageGallery.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('prev');
                  }}
                  className="absolute left-2 sm:left-4 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('next');
                  }}
                  className="absolute right-2 sm:right-4 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
            
            {/* Current Image */}
            <div 
              className="w-full h-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imageGallery[currentImageIndex]?.url}
                alt="Preview"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              
              {/* Image Info */}
              <div className="mt-4 text-white text-center bg-black bg-opacity-50 rounded-lg p-3">
                <p className="text-sm">
                  Sent by {imageGallery[currentImageIndex]?.sender} •{' '}
                  {formatDate(imageGallery[currentImageIndex]?.timestamp)}
                </p>
                {imageGallery.length > 1 && (
                  <p className="text-xs mt-1 text-gray-300">
                    {currentImageIndex + 1} of {imageGallery.length}
                  </p>
                )}
                
                {/* Download Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(imageGallery[currentImageIndex]?.url, `image_${currentImageIndex + 1}.jpg`);
                  }}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors mx-auto"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}