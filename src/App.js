import React, { useState, useEffect } from 'react';
import './App.css';
import MoodleAuth from './components/MoodleAuth';
import CourseList from './components/CourseList';
import QuizInterface from './components/QuizInterface';
import TeacherChat from './components/TeacherChat';
import ConnectionStatus from './components/ConnectionStatus';
import { MoodleAPI } from './services/MoodleAPI';
import { OfflineManager } from './services/OfflineManager';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('auth'); // auth, courses, quiz, chat
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [moodleServer, setMoodleServer] = useState('gs.teebase.net');

  // Initialize services
  const [moodleAPI] = useState(() => new MoodleAPI(moodleServer));
  const [offlineManager] = useState(() => new OfflineManager());

  useEffect(() => {
    // Check for saved authentication
    const savedAuth = localStorage.getItem('moodle_auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        setUser(authData.user);
        moodleAPI.setToken(authData.token);
        setCurrentView('courses');
      } catch (error) {
        console.error('Failed to restore authentication:', error);
        localStorage.removeItem('moodle_auth');
      }
    }

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      offlineManager.syncPendingData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize offline manager
    offlineManager.initialize();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [moodleAPI, offlineManager]);

  const handleLogin = async (credentials) => {
    try {
      const authResult = await moodleAPI.authenticate(credentials.email, credentials.password, credentials.server || moodleServer);
      
      setUser(authResult.user);
      setMoodleServer(credentials.server || moodleServer);
      
      // Save authentication data
      localStorage.setItem('moodle_auth', JSON.stringify({
        user: authResult.user,
        token: authResult.token,
        server: credentials.server || moodleServer
      }));
      
      setCurrentView('courses');
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('moodle_auth');
    setUser(null);
    setCurrentView('auth');
    setSelectedCourse(null);
    setSelectedQuiz(null);
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    // Stay in courses view to show quizzes
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

  const handleChatClose = () => {
    setCurrentView('courses');
    setSelectedQuiz(null);
  };

  return (
    <div className="App">
      <ConnectionStatus isOnline={isOnline} />
      
      {currentView === 'auth' && (
        <MoodleAuth 
          onLogin={handleLogin}
          defaultServer={moodleServer}
        />
      )}
      
      {currentView === 'courses' && (
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
      )}
      
      {currentView === 'quiz' && selectedQuiz && (
        <QuizInterface
          quiz={selectedQuiz}
          user={user}
          moodleAPI={moodleAPI}
          offlineManager={offlineManager}
          onComplete={handleQuizComplete}
          onBack={handleBackToCourses}
          isOnline={isOnline}
        />
      )}
      
      {currentView === 'chat' && selectedQuiz && (
        <TeacherChat
          quiz={selectedQuiz}
          course={selectedCourse}
          user={user}
          moodleAPI={moodleAPI}
          offlineManager={offlineManager}
          onClose={handleChatClose}
          isOnline={isOnline}
        />
      )}
    </div>
  );
}

export default App;