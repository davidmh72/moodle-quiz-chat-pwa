import React, { useState, useEffect } from 'react';

const CourseList = ({ 
  user, 
  moodleAPI, 
  offlineManager, 
  selectedCourse, 
  onCourseSelect, 
  onQuizStart, 
  onLogout, 
  isOnline 
}) => {
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    loadCourses();
  }, [user]);

  useEffect(() => {
    if (selectedCourse) {
      loadQuizzes(selectedCourse.id);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError('');
      
      let coursesData;
      if (isOnline) {
        // Fetch from Moodle API
        coursesData = await moodleAPI.getUserCourses(user.id);
        // Cache courses offline
        await offlineManager.storeCourses(coursesData);
      } else {
        // Load from offline storage
        coursesData = await offlineManager.getCachedCourses();
        if (!coursesData || coursesData.length === 0) {
          setError('No courses available offline. Please connect to internet to download courses.');
          return;
        }
      }
      
      setCourses(coursesData);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError('Failed to load courses. Please try again.');
      
      // Try to load cached courses as fallback
      try {
        const cachedCourses = await offlineManager.getCachedCourses();
        if (cachedCourses && cachedCourses.length > 0) {
          setCourses(cachedCourses);
          setError('Showing cached courses (offline)');
        }
      } catch (cacheErr) {
        console.error('Failed to load cached courses:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadQuizzes = async (courseId) => {
    try {
      setError('');
      
      let quizzesData;
      if (isOnline) {
        // Fetch from Moodle API
        quizzesData = await moodleAPI.getCourseQuizzes(courseId);
        // Cache quizzes offline
        await offlineManager.storeQuizzes(courseId, quizzesData);
      } else {
        // Load from offline storage
        quizzesData = await offlineManager.getCachedQuizzes(courseId);
      }
      
      setQuizzes(quizzesData || []);
    } catch (err) {
      console.error('Failed to load quizzes:', err);
      setError('Failed to load quizzes for this course.');
      
      // Try to load cached quizzes as fallback
      try {
        const cachedQuizzes = await offlineManager.getCachedQuizzes(courseId);
        setQuizzes(cachedQuizzes || []);
      } catch (cacheErr) {
        console.error('Failed to load cached quizzes:', cacheErr);
      }
    }
  };

  const handleDownloadContent = async () => {
    if (!isOnline) {
      setError('Cannot download content while offline.');
      return;
    }

    try {
      setSyncStatus('syncing');
      setError('');
      
      // Download all course content for offline use
      for (const course of courses) {
        const courseQuizzes = await moodleAPI.getCourseQuizzes(course.id);
        await offlineManager.storeQuizzes(course.id, courseQuizzes);
        
        // Download quiz details and questions
        for (const quiz of courseQuizzes) {
          if (quiz.available) {
            const quizDetails = await moodleAPI.getQuizDetails(quiz.id);
            await offlineManager.storeQuizDetails(quiz.id, quizDetails);
          }
        }
      }
      
      setSyncStatus('completed');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to download content:', err);
      setError('Failed to download content. Please try again.');
      setSyncStatus('idle');
    }
  };

  const handleRefresh = () => {
    if (selectedCourse) {
      loadQuizzes(selectedCourse.id);
    } else {
      loadCourses();
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="pwa-container">
      <div className="nav-header">
        {selectedCourse ? (
          <>
            <button 
              className="nav-back" 
              onClick={() => onCourseSelect(null)}
              aria-label="Back to courses"
            >
              ←
            </button>
            <h1 className="nav-title">{selectedCourse.name}</h1>
          </>
        ) : (
          <>
            <h1 className="nav-title">My Courses</h1>
            <div className="nav-actions">
              <button className="nav-button" onClick={handleRefresh}>
                🔄 Refresh
              </button>
              {isOnline && (
                <button 
                  className="nav-button" 
                  onClick={handleDownloadContent}
                  disabled={syncStatus === 'syncing'}
                >
                  {syncStatus === 'syncing' ? '⏳ Downloading...' : '💾 Download All'}
                </button>
              )}
              <button className="nav-button" onClick={onLogout}>
                🚪 Logout
              </button>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="error-container">
          <div className="error-message">{error}</div>
        </div>
      )}

      {syncStatus === 'completed' && (
        <div className="success-container">
          ✓ All content downloaded for offline use!
        </div>
      )}

      {!selectedCourse ? (
        // Course List View
        <div className="course-list">
          {courses.length === 0 ? (
            <div className="text-center" style={{ padding: '2rem', color: '#6b7280' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
              <p>No courses available.</p>
              <p>Contact your instructor to get enrolled in courses.</p>
            </div>
          ) : (
            courses.map(course => (
              <div 
                key={course.id} 
                className="course-item"
                onClick={() => onCourseSelect(course)}
              >
                <div>
                  <div className="course-title">{course.name}</div>
                  <div className="course-description">
                    {course.summary || 'No description available'}
                  </div>
                </div>
                <div className="quiz-count">
                  {course.quizCount || '?'} quizzes
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Quiz List View
        <div className="course-list">
          {quizzes.length === 0 ? (
            <div className="text-center" style={{ padding: '2rem', color: '#6b7280' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
              <p>No quizzes available in this course.</p>
              {!isOnline && (
                <p>Connect to internet to check for new quizzes.</p>
              )}
            </div>
          ) : (
            quizzes.map(quiz => (
              <div 
                key={quiz.id} 
                className={`quiz-item ${!quiz.available ? 'disabled' : ''}`}
                onClick={() => quiz.available && onQuizStart(quiz)}
                style={{ 
                  cursor: quiz.available ? 'pointer' : 'not-allowed',
                  opacity: quiz.available ? 1 : 0.6
                }}
              >
                <div>
                  <div className="quiz-title">{quiz.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {quiz.description || 'No description'}
                  </div>
                  {quiz.timeLimit && (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                      ⏱️ Time limit: {quiz.timeLimit} minutes
                    </div>
                  )}
                </div>
                <div className={`quiz-status ${
                  quiz.completed ? 'completed' : 
                  quiz.available ? 'available' : 'locked'
                }`}>
                  {quiz.completed ? 'Completed' : 
                   quiz.available ? 'Available' : 'Locked'}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!isOnline && (
        <div style={{ 
          position: 'fixed', 
          bottom: '1rem', 
          left: '1rem', 
          right: '1rem',
          background: '#fef3c7',
          color: '#92400e',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
          textAlign: 'center'
        }}>
          📡 Offline mode - Showing cached content
        </div>
      )}
    </div>
  );
};

export default CourseList;