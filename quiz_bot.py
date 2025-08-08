#!/usr/bin/env python3
"""
Moodle Quiz Bot for Matrix

Delivers Moodle quiz content through Matrix chat interface
- Connects to Moodle API for quiz content
- Creates per-student quiz rooms in Matrix
- Delivers questions sequentially as chat messages
- Handles teacher notifications and help requests
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

# Matrix SDK
from nio import AsyncClient, MatrixRoom, RoomMessageText
from nio.events import Event

# HTTP requests for Moodle API
import aiohttp

# Configuration
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class QuizSession:
    """Active quiz session state"""
    room_id: str
    student_id: str
    quiz_id: str
    current_question: int = 0
    answers: Dict[str, str] = None
    started_at: datetime = None
    
    def __post_init__(self):
        if self.answers is None:
            self.answers = {}
        if self.started_at is None:
            self.started_at = datetime.now()

@dataclass
class QuizQuestion:
    """Individual quiz question"""
    id: str
    text: str
    options: List[str]
    question_type: str
    order: int

class MoodleClient:
    """Interface to Moodle Web Services API"""
    
    def __init__(self, server_url: str, api_token: str):
        self.server_url = server_url.rstrip('/')
        self.api_token = api_token
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def api_call(self, function: str, params: Dict) -> Dict:
        """Make Moodle Web Services API call"""
        url = f"{self.server_url}/webservice/rest/server.php"
        
        data = {
            'wstoken': self.api_token,
            'wsfunction': function,
            'moodlewsrestformat': 'json',
            **params
        }
        
        async with self.session.post(url, data=data) as response:
            result = await response.json()
            
            if isinstance(result, dict) and 'exception' in result:
                raise Exception(f"Moodle API Error: {result['message']}")
            
            return result
    
    async def get_user_courses(self, user_id: str) -> List[Dict]:
        """Get courses for a user"""
        return await self.api_call('core_enrol_get_users_courses', {
            'userid': user_id
        })
    
    async def get_course_quizzes(self, course_id: str) -> List[Dict]:
        """Get available quizzes for a course"""
        return await self.api_call('mod_quiz_get_quizzes_by_courses', {
            'courseids[0]': course_id
        })
    
    async def get_quiz_questions(self, quiz_id: str) -> List[QuizQuestion]:
        """Get questions for a quiz (simplified for demo)"""
        # This would typically fetch from Moodle's question bank
        # For now, return sample questions
        return [
            QuizQuestion("q1", "What is 2 + 2?", ["A) 3", "B) 4", "C) 5", "D) 6"], "multiple_choice", 1),
            QuizQuestion("q2", "What is 5 × 3?", ["A) 15", "B) 12", "C) 18", "D) 20"], "multiple_choice", 2),
            QuizQuestion("q3", "What is the capital of France?", ["A) London", "B) Berlin", "C) Paris", "D) Madrid"], "multiple_choice", 3),
        ]
    
    async def submit_quiz_attempt(self, quiz_id: str, user_id: str, answers: Dict) -> Dict:
        """Submit completed quiz attempt"""
        # Implementation would submit to Moodle's quiz API
        logger.info(f"Submitting quiz {quiz_id} for user {user_id}: {answers}")
        return {"success": True, "attempt_id": "12345"}

class QuizBot:
    """Main Quiz Bot class"""
    
    def __init__(self):
        # Matrix configuration
        self.homeserver = os.getenv('MATRIX_HOMESERVER', 'https://matrix.org')
        self.username = os.getenv('MATRIX_BOT_USERNAME')
        self.password = os.getenv('MATRIX_BOT_PASSWORD')
        
        # Moodle configuration  
        self.moodle_server = os.getenv('MOODLE_SERVER', 'https://gs.teebase.net')
        self.moodle_token = os.getenv('MOODLE_API_TOKEN')
        
        # Bot state
        self.client: Optional[AsyncClient] = None
        self.moodle: Optional[MoodleClient] = None
        self.active_sessions: Dict[str, QuizSession] = {}
        
        logger.info(f"Quiz Bot initialized for {self.homeserver}")
    
    async def start(self):
        """Start the bot"""
        logger.info("Starting Quiz Bot...")
        
        # Initialize Matrix client
        self.client = AsyncClient(self.homeserver, self.username)
        
        # Set up event handlers
        self.client.add_event_callback(self.message_callback, RoomMessageText)
        
        # Login to Matrix
        response = await self.client.login(self.password)
        if hasattr(response, 'access_token'):
            logger.info("Successfully logged into Matrix")
        else:
            logger.error(f"Failed to login: {response}")
            return
        
        # Initialize Moodle client
        self.moodle = MoodleClient(self.moodle_server, self.moodle_token)
        
        # Start syncing
        await self.client.sync_forever(timeout=30000)
    
    async def message_callback(self, room: MatrixRoom, event: Event):
        """Handle incoming Matrix messages"""
        # Ignore messages from the bot itself
        if event.sender == self.client.user_id:
            return
        
        message_content = event.body.strip().lower()
        
        logger.info(f"Message in {room.room_id}: {event.body}")
        
        # Handle quiz commands
        if message_content.startswith('!quiz'):
            await self.handle_quiz_command(room, event)
        elif message_content in ['help', '!help']:
            await self.handle_help_request(room, event)
        elif room.room_id in self.active_sessions:
            await self.handle_quiz_answer(room, event)
        else:
            # General commands
            await self.handle_general_message(room, event)
    
    async def handle_quiz_command(self, room: MatrixRoom, event: Event):
        """Handle !quiz commands"""
        parts = event.body.split()
        
        if len(parts) < 2:
            await self.send_message(room, 
                "📚 Quiz Bot Commands:\n"
                "• `!quiz list` - Show available quizzes\n"
                "• `!quiz start <quiz_id>` - Start a quiz\n"
                "• `!help` - Get help from teacher"
            )
            return
        
        command = parts[1].lower()
        
        if command == 'list':
            await self.list_available_quizzes(room, event)
        elif command == 'start' and len(parts) > 2:
            quiz_id = parts[2]
            await self.start_quiz(room, event, quiz_id)
        else:
            await self.send_message(room, "❌ Unknown quiz command. Type `!quiz` for help.")
    
    async def list_available_quizzes(self, room: MatrixRoom, event: Event):
        """List available quizzes for the student"""
        # For demo, show sample quizzes
        message = (
            "📚 **Available Quizzes:**\n\n"
            "🔢 `quiz_math_1` - Basic Math Chapter 1\n"
            "🔠 `quiz_english_1` - Grammar Basics\n"
            "🧪 `quiz_science_1` - Introduction to Physics\n\n"
            "To start a quiz, type: `!quiz start quiz_math_1`"
        )
        await self.send_message(room, message)
    
    async def start_quiz(self, room: MatrixRoom, event: Event, quiz_id: str):
        """Start a new quiz session"""
        if room.room_id in self.active_sessions:
            await self.send_message(room, "❌ You already have an active quiz in this room. Complete it first!")
            return
        
        try:
            # Get quiz questions from Moodle
            async with MoodleClient(self.moodle_server, self.moodle_token) as moodle:
                questions = await moodle.get_quiz_questions(quiz_id)
            
            # Create quiz session
            session = QuizSession(
                room_id=room.room_id,
                student_id=event.sender,
                quiz_id=quiz_id
            )
            
            self.active_sessions[room.room_id] = session
            
            # Send welcome message and first question
            await self.send_message(room, 
                f"🎯 **Starting Quiz: {quiz_id}**\n\n"
                f"📝 Total Questions: {len(questions)}\n"
                f"⏰ No time limit - take your time!\n"
                f"🆘 Type `help` if you need assistance\n\n"
                "Ready? Here's your first question..."
            )
            
            await self.send_next_question(room, session, questions)
            
        except Exception as e:
            logger.error(f"Error starting quiz: {e}")
            await self.send_message(room, f"❌ Error starting quiz: {e}")
    
    async def send_next_question(self, room: MatrixRoom, session: QuizSession, questions: List[QuizQuestion]):
        """Send the next question to the student"""
        if session.current_question >= len(questions):
            await self.complete_quiz(room, session)
            return
        
        question = questions[session.current_question]
        
        message = (
            f"**Question {session.current_question + 1} of {len(questions)}**\n\n"
            f"❓ {question.text}\n\n"
            f"{chr(10).join(question.options)}\n\n"
            "💡 Type your answer (A, B, C, or D)"
        )
        
        await self.send_message(room, message)
    
    async def handle_quiz_answer(self, room: MatrixRoom, event: Event):
        """Handle student's answer to quiz question"""
        session = self.active_sessions.get(room.room_id)
        if not session:
            return
        
        answer = event.body.strip().upper()
        
        # Validate answer format
        if answer not in ['A', 'B', 'C', 'D']:
            await self.send_message(room, "⚠️ Please answer with A, B, C, or D")
            return
        
        # Store answer
        question_key = f"q{session.current_question + 1}"
        session.answers[question_key] = answer
        
        # Move to next question
        session.current_question += 1
        
        # Get quiz questions and continue
        try:
            async with MoodleClient(self.moodle_server, self.moodle_token) as moodle:
                questions = await moodle.get_quiz_questions(session.quiz_id)
            
            await self.send_message(room, f"✅ Answer recorded: {answer}")
            await self.send_next_question(room, session, questions)
            
        except Exception as e:
            logger.error(f"Error processing answer: {e}")
            await self.send_message(room, f"❌ Error processing answer: {e}")
    
    async def complete_quiz(self, room: MatrixRoom, session: QuizSession):
        """Complete the quiz and submit to Moodle"""
        try:
            # Submit to Moodle
            async with MoodleClient(self.moodle_server, self.moodle_token) as moodle:
                result = await moodle.submit_quiz_attempt(
                    session.quiz_id,
                    session.student_id,
                    session.answers
                )
            
            # Send completion message
            await self.send_message(room, 
                f"🎉 **Quiz Completed!**\n\n"
                f"📝 Questions answered: {len(session.answers)}\n"
                f"⏰ Time taken: {datetime.now() - session.started_at}\n"
                f"✅ Submitted to Moodle successfully!\n\n"
                f"💬 This room is now available for discussion with your teacher.\n"
                f"Feel free to ask questions about the quiz content!"
            )
            
            # Remove from active sessions
            del self.active_sessions[room.room_id]
            
            # Notify teacher (would implement course room notification)
            logger.info(f"Quiz {session.quiz_id} completed by {session.student_id}")
            
        except Exception as e:
            logger.error(f"Error completing quiz: {e}")
            await self.send_message(room, f"❌ Error submitting quiz: {e}")
    
    async def handle_help_request(self, room: MatrixRoom, event: Event):
        """Handle student help request"""
        await self.send_message(room, 
            "🆘 **Help Request Sent!**\n\n"
            "Your teacher has been notified and will join this room shortly.\n"
            "In the meantime, you can:\n"
            "• Continue with the quiz\n"  
            "• Review the question carefully\n"
            "• Think about what you already know about this topic"
        )
        
        # Notify teacher in course room (implementation needed)
        logger.info(f"Help request from {event.sender} in {room.room_id}")
    
    async def handle_general_message(self, room: MatrixRoom, event: Event):
        """Handle general messages"""
        if any(word in event.body.lower() for word in ['hello', 'hi', 'hey']):
            await self.send_message(room,
                "👋 Hello! I'm the Quiz Bot.\n\n"
                "📚 Type `!quiz` to see available commands\n"
                "🆘 Type `help` if you need assistance"
            )
    
    async def send_message(self, room: MatrixRoom, message: str):
        """Send a message to a Matrix room"""
        try:
            await self.client.room_send(
                room_id=room.room_id,
                message_type="m.room.message",
                content={
                    "msgtype": "m.text",
                    "body": message,
                    "format": "org.matrix.custom.html",
                    "formatted_body": message.replace('\n', '<br/>')
                }
            )
        except Exception as e:
            logger.error(f"Error sending message: {e}")

async def main():
    """Main entry point"""
    bot = QuizBot()
    try:
        await bot.start()
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Bot error: {e}")
    finally:
        if bot.client:
            await bot.client.close()

if __name__ == "__main__":
    asyncio.run(main())
