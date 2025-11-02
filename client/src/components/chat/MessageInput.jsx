import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Image, Video, File, X } from 'lucide-react';

export default function MessageInput({
  selectedUser,
  newMessage,
  onMessageChange,
  onSendMessage,
  onFileMessage,
  isSending
}) {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const modalRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const paperclipButtonRef = useRef(null);


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      handleCancelFiles();
    }
  };

  if (filePreviews.length > 0) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [filePreviews]);

useEffect(() => {
  const handleClickOutside = (event) => {
    const clickedOutsideMenu =
      attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target);
    const clickedOutsideButton =
      paperclipButtonRef.current && !paperclipButtonRef.current.contains(event.target);

    if (clickedOutsideMenu && clickedOutsideButton) {
      setShowAttachmentMenu(false);
    }
  };

  if (showAttachmentMenu) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [showAttachmentMenu]);

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const previews = files.map(file => {
      const base = {
        name: file.name,
        raw: file,
        type:
          file.type.startsWith('image/') ? 'image' :
          file.type.startsWith('video/') ? 'video' : 'file'
      };

      if (base.type === 'image' || base.type === 'video') {
        const reader = new FileReader();
        return new Promise(resolve => {
          reader.onload = (event) => {
            resolve({
              ...base,
              url: event.target.result
            });
          };
          reader.readAsDataURL(file);
        });
      } else {
        return Promise.resolve({
          ...base,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        });
      }
    });

    Promise.all(previews).then(previews => {
      setSelectedFiles(prev => [...prev, ...files]);
      setFilePreviews(prev => [...prev, ...previews]);
    });
  };

  const handleSendFiles = () => {
    if (selectedFiles.length > 0) {
      onFileMessage(selectedFiles);
      setSelectedFiles([]);
      setFilePreviews([]);
    }
  };

  const handleCancelFiles = () => {
    setSelectedFiles([]);
    setFilePreviews([]);
  };

  const triggerFileInput = (type) => {
    setShowAttachmentMenu(false);
    switch (type) {
      case 'image':
        imageInputRef.current.click();
        break;
      case 'video':
        videoInputRef.current.click();
        break;
      case 'file':
        fileInputRef.current.click();
        break;
      default:
        break;
    }
  };

  if (!selectedUser) {
    return (
      <div className="text-center text-gray-400 py-2">
        Select a contact to start chatting
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Hidden file inputs */}
      <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'file')} multiple className="hidden" />
      <input type="file" ref={imageInputRef} onChange={(e) => handleFileChange(e, 'image')} accept="image/*" multiple className="hidden" />
      <input type="file" ref={videoInputRef} onChange={(e) => handleFileChange(e, 'video')} accept="video/*" multiple className="hidden" />

      {/* Preview Modal */}
      {filePreviews.length > 0 && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center bg-[#00000082] backdrop-blur-[5px] z-[9999]">
          <div ref={modalRef} className="bg-white rounded-lg p-4 w-full max-w-md overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Send Files</h3>
              <button onClick={handleCancelFiles} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {filePreviews.map((preview, i) => (
                <div key={i}>
                  {preview.type === 'image' && (
                    <img src={preview.url} alt="Preview" className="w-full h-48 object-contain rounded" />
                  )}
                  {preview.type === 'video' && (
                    <video controls className="w-full h-48">
                      <source src={preview.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  )}
                  {preview.type === 'file' && (
                    <div className="flex items-center p-3 border rounded-lg">
                      <File className="w-6 h-6 mr-2 text-blue-500" />
                      <div>
                        <p className="font-medium truncate">{preview.name}</p>
                        <p className="text-sm text-gray-500">{preview.size}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4 space-x-2">
              <button onClick={handleCancelFiles} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
                Cancel
              </button>
              <button onClick={handleSendFiles} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Menu */}
      {showAttachmentMenu && (
        <div ref={attachmentMenuRef} className="absolute bottom-16 right-0 bg-white shadow-lg rounded-lg p-2 w-48 z-10">
          <button onClick={() => triggerFileInput('image')} className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-100 rounded">
            <Image className="w-5 h-5 mr-2 text-blue-500" />
            <span>Photos</span>
          </button>
          <button onClick={() => triggerFileInput('video')} className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-100 rounded">
            <Video className="w-5 h-5 mr-2 text-blue-500" />
            <span>Videos</span>
          </button>
          <button onClick={() => triggerFileInput('file')} className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-100 rounded">
            <File className="w-5 h-5 mr-2 text-blue-500" />
            <span>Documents</span>
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-center space-x-3 justify-center">
        <div className="flex-1 relative">
          <textarea
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows="1"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            style={{ minHeight: '48px', maxHeight: '120px' }}
            disabled={isSending}
          />
        </div>
        <div className="relative">
          <button
            ref={paperclipButtonRef}
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            disabled={isSending}
            className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
              !isSending
                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl active:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Paperclip ref={attachmentMenuRef} className="w-5 h-5" />
            )}
          </button>
        </div>
        <div>
          <button
            onClick={onSendMessage}
            disabled={(!newMessage.trim() && selectedFiles.length === 0) || isSending}
            className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
              (newMessage.trim() || selectedFiles.length > 0) && !isSending
                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl active:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
