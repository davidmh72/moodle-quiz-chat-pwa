import React, { useState, useEffect } from 'react';

const QuizInterface = ({ 
  quiz, 
  user, 
  moodleAPI, 
  offlineManager, 
  onComplete, 
  onBack, 
  isOnline 
}) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [showingQuestion, setShowingQuestion] = useState(false);

  useEffect(() => {
    loadQuizContent();
  }, [quiz]);

  useEffect(() => {
    if (questions.length > 0 && !showingQuestion) {
      startQuizConversation();
    }
  }, [questions]);

  const loadQuizContent = async () => {
    try {
      setLoading(true);
      setError('');
      
      let quizData;
      if (isOnline) {
        // Fetch from Moodle API
        quizData = await moodleAPI.getQuizDetails(quiz.id);
        // Cache for offline use
        await offlineManager.storeQuizDetails(quiz.id, quizData);
      } else {
        // Load from offline storage
        quizData = await offlineManager.getCachedQuizDetails(quiz.id);
        if (!quizData) {
          setError('Quiz not available offline. Please connect to internet to download this quiz.');
          return;
        }
      }
      
      setQuestions(quizData.questions || []);
    } catch (err) {
      console.error('Failed to load quiz:', err);
      setError('Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startQuizConversation = () => {
    const welcomeMessages = [
      {
        id: 'welcome',
        type: 'bot',
        content: `Hi! Ready to start "${quiz.name}"? 📚`,
        timestamp: new Date()
      },
      {
        id: 'info',
        type: 'bot', 
        content: `This quiz has ${questions.length} questions. Take your time - there's no rush! 😊`,
        timestamp: new Date()
      }
    ];
    
    setMessages(welcomeMessages);
    
    // Show first question after a brief delay
    setTimeout(() => {
      showNextQuestion();
    }, 1500);
  };

  const showNextQuestion = () => {
    if (currentQuestionIndex >= questions.length) {
      completeQuiz();
      return;
    }

    const question = questions[currentQuestionIndex];
    const questionMessage = {
      id: `question-${currentQuestionIndex}`,
      type: 'bot',
      content: `Question ${currentQuestionIndex + 1} of ${questions.length}`,
      question: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, questionMessage]);
    setShowingQuestion(true);
  };

  const handleAnswerSelect = (questionId, optionIndex, optionText) => {
    // Store the answer
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        optionIndex,
        optionText,
        timestamp: new Date()
      }
    }));

    // Add user's answer to chat
    const answerMessage = {
      id: `answer-${questionId}`,
      type: 'user',
      content: optionText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, answerMessage]);
    setShowingQuestion(false);

    // Move to next question after a brief delay
    setTimeout(() => {
      setCurrentQuestionIndex(prev => prev + 1);
      showNextQuestion();
    }, 1000);
  };

  const completeQuiz = async () => {
    const completionMessage = {
      id: 'completion',
      type: 'bot',
      content: `Great job! You've completed the quiz. 🎉`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, completionMessage]);

    try {
      // Prepare submission data
      const submission = {
        id: `submission-${Date.now()}`,
        quizId: quiz.id,
        userId: user.id,
        answers: answers,
        completedAt: new Date().toISOString(),
        token: moodleAPI.getToken()
      };

      if (isOnline) {
        // Submit immediately
        await moodleAPI.submitQuiz(submission);
        
        const successMessage = {
          id: 'submitted',
          type: 'bot',
          content: 'Your answers have been submitted successfully! ✓',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMessage]);
      } else {
        // Store for later submission
        await offlineManager.storeSubmission(submission);
        
        const offlineMessage = {
          id: 'offline-stored',
          type: 'bot',
          content: 'Your answers are saved and will be submitted when you\'re back online. 💾',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, offlineMessage]);
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      const errorMessage = {
        id: 'submit-error',
        type: 'bot',
        content: 'There was an issue submitting your quiz. Don\'t worry - your answers are saved! 💾',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    // Show chat button after completion
    setTimeout(() => {
      const chatMessage = {
        id: 'chat-prompt',
        type: 'bot',
        content: 'Have questions about this quiz? You can chat with your teacher! 💬',
        showChatButton: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, chatMessage]);
    }, 2000);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleNeedHelp = () => {
    // Go directly to teacher chat
    onComplete();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading quiz...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pwa-container">
        <div className="nav-header">
          <button className="nav-back" onClick={onBack}>←</button>
          <h1 className="nav-title">Quiz Error</h1>
        </div>
        <div className="error-container" style={{ margin: '2rem' }}>
          <div className="error-title">Unable to Load Quiz</div>
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="nav-back" onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>
          ←
        </button>
        <div>
          <div className="nav-title" style={{ fontSize: '1.1rem' }}>{quiz.name}</div>
          <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            Question {Math.min(currentQuestionIndex + 1, questions.length)} of {questions.length}
          </div>
        </div>
        <button 
          className="nav-button" 
          onClick={handleNeedHelp}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
        >
          ❓ Help
        </button>
      </div>

      <div className="chat-body">
        {messages.map(message => (
          <div key={message.id} className={`message message-${message.type}`}>
            <div className="message-bubble">
              {message.content}
              
              {message.question && (
                <div className="question-container" style={{ marginTop: '1rem', background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                  <div className="question-text">{message.question.text}</div>
                  <div className="question-options">
                    {message.question.options.map((option, index) => (
                      <button
                        key={index}
                        className="option-button"
                        onClick={() => handleAnswerSelect(message.question.id, index, option.text)}
                      >
                        {String.fromCharCode(65 + index)}. {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {message.showChatButton && (
                <div style={{ marginTop: '1rem' }}>
                  <button 
                    className="btn"
                    onClick={onComplete}
                    style={{ width: 'auto', padding: '8px 16px', fontSize: '0.875rem' }}
                  >
                    💬 Chat with Teacher
                  </button>
                </div>
              )}
              
              <div className="message-timestamp">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isOnline && (
        <div className="chat-footer">
          <div style={{ 
            background: '#fef3c7',
            color: '#92400e',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            📡 Taking quiz offline - answers will sync when online
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizInterface;