import React, { useState, useEffect } from 'react';
import './index.css';

// Components
import MoodleAuth from './components/MoodleAuth';
import CourseList from './components/CourseList';
import QuizInterface from './components/QuizInterface';
import TeacherChat from './components/TeacherChat';
import ConnectionStatus from './components/ConnectionStatus';

// Services
import { MoodleAPI } from './services/MoodleAPI';
import { OfflineManager } from './services/OfflineManager';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login'); // login, courses, quiz, chat
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');
  
  // Service instances
  const [moodleAPI] = useState(() => new MoodleAPI('gs.teebase.net'));
  const [offlineManager] = useState(() => new OfflineManager());

  // Initialize app
  useEffect(() => {
    initializeApp();
    setupOnlineStatusListener();
  }, []);

  const initializeApp = async () => {
    try {
      await offlineManager.initialize();
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  const setupOnlineStatusListener = () => {
    const handleOnline = () => {
      setIsOnline(true);
      handleBackOnline();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };

  const handleBackOnline = async () => {
    try {
      setSyncStatus('syncing');
      await offlineManager.syncPendingData();
      setSyncStatus('completed');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to sync pending data:', error);
      setSyncStatus('idle');
    }
  };

  const handleLogin = async (formData) => {
    try {
      console.log('Attempting login with:', formData);
      
      // Demo mode - always succeed
      if (formData.email === 'student@example.com' || !isOnline) {
        // Create demo user
        const demoUser = {
          id: 'demo_user_1',
          name: 'Demo Student',
          email: formData.email,
          username: 'demo_student'
        };
        
        // Set demo token
        moodleAPI.setToken('demo_token_12345');
        
        setUser(demoUser);
        setCurrentView('courses');
        
        return { success: true };
      }
      
      // Try real authentication if online
      if (isOnline) {
        try {
          const result = await moodleAPI.authenticate(
            formData.email, 
            formData.password, 
            formData.server
          );
          
          setUser(result.user);
          setCurrentView('courses');
          
          return { success: true };
        } catch (error) {
          console.log('Real auth failed, falling back to demo mode');
          
          // Fallback to demo mode
          const demoUser = {
            id: 'demo_user_1',
            name: 'Demo Student',
            email: formData.email,
            username: 'demo_student'
          };
          
          moodleAPI.setToken('demo_token_12345');
          setUser(demoUser);
          setCurrentView('courses');
          
          return { success: true };
        }
      }
      
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Login failed. Please check your credentials.' 
      };
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
    setSelectedCourse(null);
    setSelectedQuiz(null);
    moodleAPI.setToken(null);
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
  };

  const handleQuizStart = (quiz) => {
    setSelectedQuiz(quiz);
    setCurrentView('quiz');
  };

  const handleQuizComplete = () => {
    setCurrentView('chat');
  };

  const handleBackToCourses = () => {
    setCurrentView('courses');
    setSelectedCourse(null);
    setSelectedQuiz(null);
  };

  const handleBackToQuiz = () => {
    setCurrentView('quiz');
  };

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return (
          <MoodleAuth 
            onLogin={handleLogin}
            defaultServer="gs.teebase.net"
          />
        );
        
      case 'courses':
        return (
          <CourseList
            user={user}
            moodleAPI={moodleAPI}
            offlineManager={offlineManager}
            selectedCourse={selectedCourse}
            onCourseSelect={handleCourseSelect}
            onQuizStart={handleQuizStart}
            onLogout={handleLogout}
            isOnline={isOnline}
          />
        );
        
      case 'quiz':
        return (
          <QuizInterface
            quiz={selectedQuiz}
            user={user}
            moodleAPI={moodleAPI}
            offlineManager={offlineManager}
            onComplete={handleQuizComplete}
            onBack={handleBackToCourses}
            isOnline={isOnline}
          />
        );
        
      case 'chat':
        return (
          <TeacherChat
            quiz={selectedQuiz}
            course={selectedCourse}
            user={user}
            moodleAPI={moodleAPI}
            offlineManager={offlineManager}
            onClose={handleBackToCourses}
            isOnline={isOnline}
          />
        );
        
      default:
        return <div>Loading...</div>;
    }
  };

  return (
    <div className="App">
      <ConnectionStatus 
        isOnline={isOnline} 
        syncStatus={syncStatus} 
      />
      
      {renderCurrentView()}
    </div>
  );
}

export default App;