#!/usr/bin/env python3
"""
Setup script for Moodle Quiz Bot

This script helps set up the bot environment and configuration.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required. Current version:", sys.version)
        sys.exit(1)
    print("✅ Python version:", sys.version.split()[0])

def install_dependencies():
    """Install Python dependencies"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        sys.exit(1)

def create_env_file():
    """Create .env file from template"""
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if env_file.exists():
        print("⚠️  .env file already exists")
        return
    
    if env_example.exists():
        env_example.rename(env_file)
        print("✅ Created .env file from template")
        print("📝 Please edit .env with your Matrix and Moodle credentials")
    else:
        print("❌ .env.example not found")

def create_data_directory():
    """Create data directory for bot storage"""
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    print("✅ Created data directory")

def main():
    """Main setup function"""
    print("🤖 Moodle Quiz Bot Setup")
    print("=" * 30)
    
    check_python_version()
    install_dependencies()
    create_env_file()
    create_data_directory()
    
    print("\n🎉 Setup complete!")
    print("\nNext steps:")
    print("1. Edit .env file with your credentials")
    print("2. Set up Matrix server and Moodle integration")
    print("3. Run: python quiz_bot.py")
    print("\nSee IMPLEMENTATION_PLAN.md for detailed instructions")

if __name__ == "__main__":
    main()
