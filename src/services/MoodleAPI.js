// Moodle Web Services API Integration
export class MoodleAPI {
  constructor(serverUrl) {
    this.serverUrl = serverUrl.replace(/^https?:\/\//, ''); // Remove protocol if provided
    this.token = null;
    this.baseURL = `https://${this.serverUrl}`;
  }

  setToken(token) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  // Authentication
  async authenticate(email, password, server) {
    if (server && server !== this.serverUrl) {
      this.serverUrl = server.replace(/^https?:\/\//, '');
      this.baseURL = `https://${this.serverUrl}`;
    }

    const response = await fetch(`${this.baseURL}/login/token.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: email,
        password: password,
        service: 'moodle_mobile_app'
      })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    this.token = data.token;

    // Get user info
    const userInfo = await this.getCurrentUser();
    
    return {
      token: data.token,
      user: userInfo
    };
  }

  // Get current user information
  async getCurrentUser() {
    const response = await this.makeAPICall('core_webservice_get_site_info');
    
    return {
      id: response.userid,
      name: response.fullname,
      email: response.email || '',
      username: response.username
    };
  }

  // Get user's enrolled courses
  async getUserCourses(userId) {
    const response = await this.makeAPICall('core_enrol_get_users_courses', {
      userid: userId
    });

    return response.map(course => ({
      id: course.id,
      name: course.fullname,
      shortname: course.shortname,
      summary: course.summary,
      visible: course.visible,
      enrolledusercount: course.enrolledusercount
    }));
  }

  // Get quizzes for a specific course
  async getCourseQuizzes(courseId) {
    try {
      const response = await this.makeAPICall('mod_quiz_get_quizzes_by_courses', {
        courseids: [courseId]
      });

      return response.quizzes.map(quiz => ({
        id: quiz.id,
        name: quiz.name,
        description: quiz.intro,
        courseId: quiz.course,
        timeLimit: quiz.timelimit ? Math.floor(quiz.timelimit / 60) : null, // Convert to minutes
        attempts: quiz.attempts,
        available: this.isQuizAvailable(quiz),
        completed: false // Will be determined by checking attempts
      }));
    } catch (error) {
      console.error('Failed to get course quizzes:', error);
      // Return demo data for development
      return this.getDemoQuizzes(courseId);
    }
  }

  // Get detailed quiz information including questions
  async getQuizDetails(quizId) {
    try {
      // In a real implementation, this would fetch actual quiz questions
      // For now, return demo questions
      return this.getDemoQuizDetails(quizId);
    } catch (error) {
      console.error('Failed to get quiz details:', error);
      throw new Error('Failed to load quiz details');
    }
  }

  // Get course teacher(s)
  async getCourseTeacher(courseId) {
    try {
      const response = await this.makeAPICall('core_enrol_get_enrolled_users', {
        courseid: courseId,
        options: [
          {
            name: 'withcapability',
            value: 'mod/quiz:manage'
          }
        ]
      });

      const teachers = response.filter(user => 
        user.roles && user.roles.some(role => 
          role.shortname === 'teacher' || role.shortname === 'editingteacher'
        )
      );

      if (teachers.length > 0) {
        return {
          id: teachers[0].id,
          name: teachers[0].fullname,
          email: teachers[0].email
        };
      }

      // Fallback teacher
      return {
        id: 'teacher_1',
        name: 'Course Teacher',
        email: 'teacher@example.com'
      };
    } catch (error) {
      console.error('Failed to get course teacher:', error);
      return {
        id: 'teacher_1',
        name: 'Course Teacher',
        email: 'teacher@example.com'
      };
    }
  }

  // Submit quiz answers
  async submitQuiz(submission) {
    try {
      // In a real implementation, this would submit to Moodle's quiz API
      console.log('Submitting quiz:', submission);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        submissionId: `sub_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      throw new Error('Failed to submit quiz answers');
    }
  }

  // Chat functionality (if supported by Moodle instance)
  supportsChatAPI() {
    // Check if this Moodle instance supports custom chat API
    return false; // For now, we'll use offline-only chat
  }

  async getChatMessages(quizId, userId) {
    // Placeholder for future chat API integration
    return [];
  }

  async sendChatMessage(quizId, userId, message) {
    // Placeholder for future chat API integration
    console.log('Sending chat message:', { quizId, userId, message });
  }

  // Helper method to make API calls
  async makeAPICall(functionName, params = {}) {
    if (!this.token) {
      throw new Error('No authentication token available');
    }

    const url = `${this.baseURL}/webservice/rest/server.php`;
    const requestParams = {
      wstoken: this.token,
      wsfunction: functionName,
      moodlewsrestformat: 'json',
      ...params
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(requestParams)
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.exception) {
      throw new Error(data.message || 'API call failed');
    }

    return data;
  }

  // Helper to check if quiz is available
  isQuizAvailable(quiz) {
    const now = Math.floor(Date.now() / 1000);
    
    // Check if quiz is within time bounds
    if (quiz.timeopen && now < quiz.timeopen) {
      return false; // Not yet open
    }
    
    if (quiz.timeclose && now > quiz.timeclose) {
      return false; // Already closed
    }
    
    return quiz.visible === 1;
  }

  // Demo data for development
  getDemoQuizzes(courseId) {
    return [
      {
        id: `quiz_${courseId}_1`,
        name: 'Basic Mathematics Quiz',
        description: 'Test your understanding of basic math concepts',
        courseId: courseId,
        timeLimit: 30,
        attempts: 3,
        available: true,
        completed: false
      },
      {
        id: `quiz_${courseId}_2`,
        name: 'Advanced Topics',
        description: 'Challenge yourself with advanced problems',
        courseId: courseId,
        timeLimit: 45,
        attempts: 2,
        available: false,
        completed: false
      }
    ];
  }

  getDemoQuizDetails(quizId) {
    return {
      id: quizId,
      questions: [
        {
          id: `q1_${quizId}`,
          text: 'What is 2 + 2?',
          type: 'multichoice',
          options: [
            { id: 'a', text: '3' },
            { id: 'b', text: '4' },
            { id: 'c', text: '5' },
            { id: 'd', text: '6' }
          ]
        },
        {
          id: `q2_${quizId}`,
          text: 'What is the capital of France?',
          type: 'multichoice',
          options: [
            { id: 'a', text: 'London' },
            { id: 'b', text: 'Berlin' },
            { id: 'c', text: 'Paris' },
            { id: 'd', text: 'Madrid' }
          ]
        },
        {
          id: `q3_${quizId}`,
          text: 'Which planet is closest to the Sun?',
          type: 'multichoice',
          options: [
            { id: 'a', text: 'Venus' },
            { id: 'b', text: 'Mercury' },
            { id: 'c', text: 'Earth' },
            { id: 'd', text: 'Mars' }
          ]
        }
      ]
    };
  }
}