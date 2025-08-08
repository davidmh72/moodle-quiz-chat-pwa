import React, { useState } from 'react';

const MoodleAuth = ({ onLogin, defaultServer }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    server: defaultServer || 'gs.teebase.net'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await onLogin(formData);
      if (!result.success) {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pwa-container">
      <div className="chat-header">
        <h1 className="nav-title">Moodle Quiz Chat</h1>
      </div>
      
      <div className="form-container">
        <div className="text-center mb-4">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
          <h2>Welcome!</h2>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
            Sign in with your Moodle credentials to start taking quizzes
          </p>
        </div>

        {error && (
          <div className="error-container mb-3">
            <div className="error-title">Login Failed</div>
            <div className="error-message">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              placeholder="your.email@example.com"
              disabled={isLoading}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-group">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn btn-secondary"
              style={{ width: 'auto', fontSize: '0.875rem', padding: '8px 16px' }}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </button>
          </div>

          {showAdvanced && (
            <div className="form-group">
              <label htmlFor="server" className="form-label">
                Moodle Server
              </label>
              <input
                type="text"
                id="server"
                name="server"
                value={formData.server}
                onChange={handleInputChange}
                className="form-input"
                placeholder="gs.teebase.net"
                disabled={isLoading}
              />
              <small style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                Enter your Moodle server domain (without https://)
              </small>
            </div>
          )}

          <button
            type="submit"
            className="btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ marginRight: '0.5rem' }}></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-center mt-4" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          <p>Don't have a Moodle account?</p>
          <p>Contact your instructor or institution for access.</p>
        </div>

        <div className="text-center mt-4" style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          <p>🔒 Your credentials are secure and only used to authenticate with your Moodle server.</p>
        </div>
      </div>
    </div>
  );
};

export default MoodleAuth;