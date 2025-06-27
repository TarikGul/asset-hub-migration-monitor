import React, { useState, useEffect } from 'react';
import './BackendUrlInput.css';

interface BackendUrlInputProps {
  onUrlChange: (url: string) => void;
  currentUrl: string;
  isConnected: boolean;
}

const BackendUrlInput: React.FC<BackendUrlInputProps> = ({ onUrlChange, currentUrl, isConnected }) => {
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setInputUrl(currentUrl);
  }, [currentUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      // Ensure the URL has a protocol
      let url = inputUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `http://${url}`;
      }
      onUrlChange(url);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setInputUrl(currentUrl);
      setIsEditing(false);
    }
  };

  const getDisplayUrl = (url: string) => {
    // Remove protocol for display
    return url.replace(/^https?:\/\//, '');
  };

  return (
    <div className="backend-url-input">
      {isEditing ? (
        <form onSubmit={handleSubmit} className="url-form">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter backend URL (e.g., localhost:8080)"
            className="url-input"
            autoFocus
          />
          <button type="submit" className="url-submit">
            Connect
          </button>
          <button 
            type="button" 
            onClick={() => {
              setInputUrl(currentUrl);
              setIsEditing(false);
            }}
            className="url-cancel"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="url-display" onClick={() => setIsEditing(true)}>
          <span className="url-text">{getDisplayUrl(currentUrl)}</span>
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="status-dot"></div>
            <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button className="edit-button">Edit</button>
        </div>
      )}
    </div>
  );
};

export default BackendUrlInput; 