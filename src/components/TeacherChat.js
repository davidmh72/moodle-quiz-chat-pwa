import React, { useState, useEffect, useRef } from 'react';

const TeacherChat = ({ 
  quiz, 
  course, 
  user, 
  moodleAPI, 
  offlineManager, 
  onClose, 
  isOnline 
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initializeChat();
  }, [quiz, course]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Find course teacher
      let courseTeacher;
      if (isOnline) {
        courseTeacher = await moodleAPI.getCourseTeacher(course.id);
      } else {
        courseTeacher = await offlineManager.getCachedTeacher(course.id);
      }
      
      setTeacher(courseTeacher || { name: 'Your Teacher', id: 'teacher' });
      
      // Load existing chat messages
      const chatMessages = await offlineManager.getChatMessages(quiz.id);
      
      if (chatMessages.length === 0) {
        // Initialize with welcome message
        const welcomeMessage = {
          id: `welcome-${Date.now()}`,
          type: 'teacher',
          content: `Hi ${user.name}! I'm here to help with "${quiz.name}". What questions do you have? 😊`,
          timestamp: new Date(),
          sender: courseTeacher?.name || 'Your Teacher'
        };
        
        setMessages([welcomeMessage]);
        await offlineManager.storeChatMessage(quiz.id, welcomeMessage);
      } else {
        setMessages(chatMessages);
      }
      
      // If online, sync messages with server
      if (isOnline && moodleAPI.supportsChatAPI()) {
        await syncMessagesWithServer();
      }
      
    } catch (err) {
      console.error('Failed to initialize chat:', err);
      
      // Fallback with offline-only chat
      const fallbackTeacher = { name: 'Your Teacher', id: 'teacher' };
      setTeacher(fallbackTeacher);
      
      const fallbackMessage = {
        id: `fallback-${Date.now()}`,
        type: 'teacher',
        content: `Hi! I'm here to help with "${quiz.name}". Your messages will be delivered when you're back online. 💬`,
        timestamp: new Date(),
        sender: 'Your Teacher'
      };
      
      setMessages([fallbackMessage]);
    } finally {
      setLoading(false);
    }
  };

  const syncMessagesWithServer = async () => {
    try {
      // Get server messages
      const serverMessages = await moodleAPI.getChatMessages(quiz.id, user.id);
      
      // Merge with local messages
      const localMessages = await offlineManager.getChatMessages(quiz.id);
      const allMessages = mergeMessages(serverMessages, localMessages);
      
      setMessages(allMessages);
      
      // Send any pending local messages to server
      const pendingMessages = localMessages.filter(msg => 
        msg.type === 'student' && !msg.synced
      );
      
      for (const message of pendingMessages) {
        await moodleAPI.sendChatMessage(quiz.id, user.id, message.content);
        message.synced = true;
        await offlineManager.updateChatMessage(quiz.id, message);
      }
      
    } catch (err) {
      console.error('Failed to sync messages:', err);
    }
  };

  const mergeMessages = (serverMessages, localMessages) => {
    const allMessages = [...serverMessages, ...localMessages];
    
    // Remove duplicates and sort by timestamp
    const uniqueMessages = allMessages.reduce((acc, message) => {
      const existing = acc.find(m => m.id === message.id);
      if (!existing) {
        acc.push(message);
      }
      return acc;
    }, []);
    
    return uniqueMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    const message = {
      id: `msg-${Date.now()}`,
      type: 'student',
      content: messageText,
      timestamp: new Date(),
      sender: user.name,
      synced: false
    };
    
    // Add to UI immediately
    setMessages(prev => [...prev, message]);
    
    try {
      // Store locally
      await offlineManager.storeChatMessage(quiz.id, message);
      
      if (isOnline && moodleAPI.supportsChatAPI()) {
        // Send to server
        await moodleAPI.sendChatMessage(quiz.id, user.id, messageText);
        message.synced = true;
        await offlineManager.updateChatMessage(quiz.id, message);
      } else {
        // Show offline indicator
        const offlineIndicator = {
          id: `offline-${Date.now()}`,
          type: 'system',
          content: 'Message will be sent when online',
          timestamp: new Date(),
          temporary: true
        };
        
        setMessages(prev => [...prev, offlineIndicator]);
        
        // Remove indicator after 3 seconds
        setTimeout(() => {
          setMessages(prev => prev.filter(m => m.id !== offlineIndicator.id));
        }, 3000);
      }
      
    } catch (err) {
      console.error('Failed to send message:', err);
      
      // Show error indicator
      const errorIndicator = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: 'Failed to send message - saved for retry',
        timestamp: new Date(),
        temporary: true
      };
      
      setMessages(prev => [...prev, errorIndicator]);
      
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== errorIndicator.id));
      }, 3000);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return messageDate.toLocaleDateString() + ' ' + messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button 
          className="nav-back" 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
        >
          ←
        </button>
        <div>
          <div className="nav-title" style={{ fontSize: '1.1rem' }}>
            {teacher?.name || 'Teacher'}
          </div>
          <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            About: {quiz.name}
          </div>
        </div>
        <div className={`status-indicator ${
          isOnline ? 'status-online' : 'status-offline'
        }`} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>

      <div className="chat-body">
        {messages.map(message => (
          <div key={message.id} className={`message message-${message.type === 'student' ? 'user' : 'bot'}`}>
            <div className="message-bubble">
              {message.type === 'system' && (
                <div style={{ 
                  fontSize: '0.875rem', 
                  fontStyle: 'italic', 
                  opacity: 0.8,
                  textAlign: 'center',
                  color: message.content.includes('Failed') ? '#dc2626' : '#059669'
                }}>
                  {message.content}
                </div>
              )}
              
              {message.type !== 'system' && (
                <>
                  <div>{message.content}</div>
                  <div className="message-timestamp">
                    {message.type === 'student' && !message.synced && !isOnline && (
                      <span style={{ color: '#f59e0b', marginRight: '0.5rem' }}>⏳</span>
                    )}
                    {formatTime(message.timestamp)}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-footer">
        <div className="chat-input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your teacher a question..."
            className="chat-input"
            disabled={sending}
          />
          <button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="send-button"
          >
            {sending ? (
              <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
            ) : (
              '📤'
            )}
          </button>
        </div>
        
        {!isOnline && (
          <div style={{ 
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: '#f59e0b',
            textAlign: 'center'
          }}>
            📡 Messages will be delivered when you're back online
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherChat;