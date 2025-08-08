# Moodle Quiz Chat PWA

A Progressive Web App for taking Moodle quizzes in a chat-like interface with offline support.

## Features

🎯 **Chat-like Quiz Interface** - Questions appear sequentially like WhatsApp messages  
📱 **Mobile PWA** - Install on Android/iPhone home screen  
🔌 **Offline Support** - Download quizzes and take them offline  
💬 **Teacher Chat** - Chat with teachers about specific quizzes  
🔐 **Moodle Integration** - Seamless authentication with Moodle servers  
⚡ **Real-time Sync** - Automatic syncing when connection returns

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Access to a Moodle server (default: gs.teebase.net)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/davidmh72/moodle-quiz-chat-pwa.git
   cd moodle-quiz-chat-pwa
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open in browser**
   - Navigate to `http://localhost:3000`
   - Or scan QR code on mobile for testing

### Building for Production

```bash
npm run build
```

The build folder will contain the optimized PWA ready for deployment.

## Deployment Options

### GitHub Pages (Free)
1. Push your code to GitHub
2. Go to Settings → Pages
3. Select "Deploy from branch" → main
4. Your app will be available at `https://yourusername.github.io/moodle-quiz-chat-pwa`

### Netlify (Free)
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Deploy automatically on every push

### Vercel (Free)
1. Import your GitHub repository to Vercel
2. Automatic deployment with every push
3. Custom domains supported

## Configuration

### Moodle Server Settings
The app defaults to `gs.teebase.net` but users can configure their own Moodle server in the settings.

### Environment Variables
Create a `.env` file for custom configuration:

```
REACT_APP_DEFAULT_MOODLE_SERVER=gs.teebase.net
REACT_APP_APP_NAME=Moodle Quiz Chat
```

## Architecture

### Technology Stack
- **Frontend**: React 18 with functional components
- **PWA**: Service Worker with Workbox for offline support
- **Storage**: IndexedDB for offline quiz and message storage
- **Authentication**: Moodle Web Services API
- **Chat**: Real-time messaging with offline queue
- **Build**: Create React App with PWA template

### Key Components
- `MoodleAuth` - Handles Moodle server authentication
- `QuizInterface` - Chat-like quiz taking experience
- `TeacherChat` - Per-quiz teacher-student messaging
- `OfflineManager` - Background sync and offline storage
- `PWAInstaller` - Handle app installation prompts

## User Workflows

### Student Experience
1. **Login** - Enter Moodle credentials (email/password)
2. **Browse Courses** - See enrolled courses and available quizzes
3. **Download Content** - Cache quizzes for offline access
4. **Take Quizzes** - Chat-like interface with sequential questions
5. **Chat with Teacher** - Ask questions about specific quizzes
6. **Sync Results** - Automatic submission when online

### Teacher Experience
- Teachers use the standard Moodle interface
- Receive notifications for student chat messages
- Monitor quiz progress and provide help
- Future: Dedicated teacher PWA for monitoring

## Development Guide

### Project Structure
```
src/
├── components/          # Reusable UI components
├── services/           # API and data services
├── utils/              # Helper functions
├── hooks/              # Custom React hooks
├── App.js              # Main application component
└── index.js            # Entry point

public/
├── manifest.json       # PWA configuration
├── sw.js              # Service worker
└── offline.html       # Offline fallback page
```

### Key Features Implementation

#### Offline Quiz Storage
- Quizzes downloaded to IndexedDB
- Questions cached with assets
- Answers stored locally until sync

#### Background Sync
- Service worker handles offline submissions
- Automatic retry when connection returns
- Progress indicators for sync status

#### Teacher-Student Matching
- Course enrollment data from Moodle API
- Per-quiz chat rooms
- Real-time message delivery

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/davidmh72/moodle-quiz-chat-pwa/issues)
- **Discussions**: [GitHub Discussions](https://github.com/davidmh72/moodle-quiz-chat-pwa/discussions)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Roadmap

- ✅ Student PWA with chat-like quizzes
- ✅ Offline functionality and sync
- ✅ Moodle integration and authentication
- 🔄 Teacher chat functionality
- 📋 Teacher PWA dashboard
- 🔔 Push notifications
- 📊 Advanced analytics
- 🌐 Multi-language support

---

**Built with ❤️ for better mobile learning experiences**
