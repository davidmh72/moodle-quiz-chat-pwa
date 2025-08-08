// Offline Data Management using IndexedDB
export class OfflineManager {
  constructor() {
    this.dbName = 'MoodleQuizDB';
    this.version = 1;
    this.db = null;
  }

  // Initialize the database
  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('courses')) {
          db.createObjectStore('courses', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('quizzes')) {
          const quizStore = db.createObjectStore('quizzes', { keyPath: 'id' });
          quizStore.createIndex('courseId', 'courseId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('quizDetails')) {
          db.createObjectStore('quizDetails', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('quizId', 'quizId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('submissions')) {
          const submissionStore = db.createObjectStore('submissions', { keyPath: 'id' });
          submissionStore.createIndex('synced', 'synced', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('teachers')) {
          const teacherStore = db.createObjectStore('teachers', { keyPath: 'courseId' });
        }
      };
    });
  }

  // Generic method to perform database operations
  async performDBOperation(storeName, operation, data = null) {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 
        operation === 'get' || operation === 'getAll' ? 'readonly' : 'readwrite'
      );
      const store = transaction.objectStore(storeName);
      
      let request;
      
      switch (operation) {
        case 'add':
        case 'put':
          request = store.put(data);
          break;
        case 'get':
          request = store.get(data);
          break;
        case 'getAll':
          request = store.getAll();
          break;
        case 'delete':
          request = store.delete(data);
          break;
        case 'getByIndex':
          const index = store.index(data.indexName);
          request = index.getAll(data.value);
          break;
        default:
          reject(new Error(`Unknown operation: ${operation}`));
          return;
      }
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Course management
  async storeCourses(courses) {
    try {
      for (const course of courses) {
        await this.performDBOperation('courses', 'put', {
          ...course,
          cachedAt: new Date().toISOString()
        });
      }
      console.log(`Stored ${courses.length} courses offline`);
    } catch (error) {
      console.error('Failed to store courses:', error);
      throw error;
    }
  }

  async getCachedCourses() {
    try {
      const courses = await this.performDBOperation('courses', 'getAll');
      return courses || [];
    } catch (error) {
      console.error('Failed to get cached courses:', error);
      return [];
    }
  }

  // Quiz management
  async storeQuizzes(courseId, quizzes) {
    try {
      for (const quiz of quizzes) {
        await this.performDBOperation('quizzes', 'put', {
          ...quiz,
          courseId,
          cachedAt: new Date().toISOString()
        });
      }
      console.log(`Stored ${quizzes.length} quizzes for course ${courseId}`);
    } catch (error) {
      console.error('Failed to store quizzes:', error);
      throw error;
    }
  }

  async getCachedQuizzes(courseId) {
    try {
      const quizzes = await this.performDBOperation('quizzes', 'getByIndex', {
        indexName: 'courseId',
        value: courseId
      });
      return quizzes || [];
    } catch (error) {
      console.error('Failed to get cached quizzes:', error);
      return [];
    }
  }

  // Quiz details management
  async storeQuizDetails(quizId, details) {
    try {
      await this.performDBOperation('quizDetails', 'put', {
        ...details,
        id: quizId,
        cachedAt: new Date().toISOString()
      });
      console.log(`Stored details for quiz ${quizId}`);
    } catch (error) {
      console.error('Failed to store quiz details:', error);
      throw error;
    }
  }

  async getCachedQuizDetails(quizId) {
    try {
      const details = await this.performDBOperation('quizDetails', 'get', quizId);
      return details || null;
    } catch (error) {
      console.error('Failed to get cached quiz details:', error);
      return null;
    }
  }

  // Chat message management
  async storeChatMessage(quizId, message) {
    try {
      await this.performDBOperation('messages', 'put', {
        ...message,
        quizId,
        storedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to store chat message:', error);
      throw error;
    }
  }

  async getChatMessages(quizId) {
    try {
      const messages = await this.performDBOperation('messages', 'getByIndex', {
        indexName: 'quizId',
        value: quizId
      });
      
      // Sort by timestamp
      return (messages || []).sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    } catch (error) {
      console.error('Failed to get chat messages:', error);
      return [];
    }
  }

  async updateChatMessage(quizId, message) {
    try {
      await this.performDBOperation('messages', 'put', {
        ...message,
        quizId,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update chat message:', error);
      throw error;
    }
  }

  // Teacher management
  async storeTeacher(courseId, teacher) {
    try {
      await this.performDBOperation('teachers', 'put', {
        courseId,
        ...teacher,
        cachedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to store teacher:', error);
      throw error;
    }
  }

  async getCachedTeacher(courseId) {
    try {
      const teacher = await this.performDBOperation('teachers', 'get', courseId);
      return teacher || null;
    } catch (error) {
      console.error('Failed to get cached teacher:', error);
      return null;
    }
  }

  // Quiz submission management
  async storeSubmission(submission) {
    try {
      await this.performDBOperation('submissions', 'put', {
        ...submission,
        synced: false,
        storedAt: new Date().toISOString()
      });
      console.log(`Stored submission ${submission.id} for later sync`);
    } catch (error) {
      console.error('Failed to store submission:', error);
      throw error;
    }
  }

  async getPendingSubmissions() {
    try {
      const submissions = await this.performDBOperation('submissions', 'getByIndex', {
        indexName: 'synced',
        value: false
      });
      return submissions || [];
    } catch (error) {
      console.error('Failed to get pending submissions:', error);
      return [];
    }
  }

  async markSubmissionSynced(submissionId) {
    try {
      const submission = await this.performDBOperation('submissions', 'get', submissionId);
      if (submission) {
        submission.synced = true;
        submission.syncedAt = new Date().toISOString();
        await this.performDBOperation('submissions', 'put', submission);
      }
    } catch (error) {
      console.error('Failed to mark submission as synced:', error);
      throw error;
    }
  }

  // Sync pending data when online
  async syncPendingData() {
    try {
      console.log('Starting offline data sync...');
      
      // Get pending submissions
      const pendingSubmissions = await this.getPendingSubmissions();
      
      if (pendingSubmissions.length > 0) {
        console.log(`Found ${pendingSubmissions.length} pending submissions to sync`);
        
        // Note: In a real implementation, you would inject the MoodleAPI here
        // For now, we'll just mark them as synced after a delay
        for (const submission of pendingSubmissions) {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          await this.markSubmissionSynced(submission.id);
          console.log(`Synced submission ${submission.id}`);
        }
      }
      
      // Sync chat messages
      await this.syncPendingMessages();
      
      console.log('Offline data sync completed');
    } catch (error) {
      console.error('Failed to sync pending data:', error);
    }
  }

  async syncPendingMessages() {
    try {
      // Get all unsynced messages
      const allMessages = await this.performDBOperation('messages', 'getAll');
      const unsyncedMessages = allMessages.filter(msg => 
        msg.type === 'student' && !msg.synced
      );
      
      if (unsyncedMessages.length > 0) {
        console.log(`Found ${unsyncedMessages.length} pending messages to sync`);
        
        // In a real implementation, send these to the server
        for (const message of unsyncedMessages) {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          message.synced = true;
          message.syncedAt = new Date().toISOString();
          await this.performDBOperation('messages', 'put', message);
        }
      }
    } catch (error) {
      console.error('Failed to sync pending messages:', error);
    }
  }

  // Cleanup old data
  async cleanupOldData(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffISO = cutoffDate.toISOString();
      
      console.log(`Cleaning up data older than ${cutoffDate.toLocaleDateString()}`);
      
      // Clean up old synced submissions
      const submissions = await this.performDBOperation('submissions', 'getAll');
      for (const submission of submissions) {
        if (submission.synced && submission.syncedAt < cutoffISO) {
          await this.performDBOperation('submissions', 'delete', submission.id);
        }
      }
      
      // Clean up old messages (keep recent conversations)
      const messages = await this.performDBOperation('messages', 'getAll');
      for (const message of messages) {
        if (message.storedAt < cutoffISO) {
          await this.performDBOperation('messages', 'delete', message.id);
        }
      }
      
      console.log('Data cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  // Get storage usage statistics
  async getStorageStats() {
    try {
      const stats = {
        courses: 0,
        quizzes: 0,
        quizDetails: 0,
        messages: 0,
        submissions: 0,
        teachers: 0
      };
      
      const stores = Object.keys(stats);
      for (const store of stores) {
        const data = await this.performDBOperation(store, 'getAll');
        stats[store] = data.length;
      }
      
      return stats;
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return null;
    }
  }

  // Clear all offline data
  async clearAllData() {
    try {
      const stores = ['courses', 'quizzes', 'quizDetails', 'messages', 'submissions', 'teachers'];
      
      for (const storeName of stores) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await new Promise((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
      console.log('All offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }
}