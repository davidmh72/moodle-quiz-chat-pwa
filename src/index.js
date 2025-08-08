import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize IndexedDB for offline storage
if ('indexedDB' in window) {
  initializeDB();
}

function initializeDB() {
  const request = indexedDB.open('MoodleQuizDB', 1);
  
  request.onerror = function(event) {
    console.error('Database error:', event.target.error);
  };
  
  request.onsuccess = function(event) {
    console.log('Database initialized successfully');
  };
  
  request.onupgradeneeded = function(event) {
    const db = event.target.result;
    
    // Create object stores
    if (!db.objectStoreNames.contains('quizzes')) {
      const quizStore = db.createObjectStore('quizzes', { keyPath: 'id' });
      quizStore.createIndex('courseId', 'courseId', { unique: false });
    }
    
    if (!db.objectStoreNames.contains('messages')) {
      const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
      messageStore.createIndex('quizId', 'quizId', { unique: false });
      messageStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
    
    if (!db.objectStoreNames.contains('submissions')) {
      db.createObjectStore('submissions', { keyPath: 'id' });
    }
    
    if (!db.objectStoreNames.contains('courses')) {
      db.createObjectStore('courses', { keyPath: 'id' });
    }
  };
}