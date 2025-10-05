#!/usr/bin/env python3
"""
Ultimate App Launcher - Just run: py go.py
Clean, simple, and handles Ctrl+C perfectly!
"""

import sys
import os
import subprocess
import signal
from pathlib import Path

def main():
    # Get port from command line args or use default
    port = "8001"  # Default to match start-all-services.ps1
    if len(sys.argv) > 1:
        try:
            port = str(int(sys.argv[1]))  # Validate it's a number
        except ValueError:
            print(f"❌ Invalid port: {sys.argv[1]}")
            return 1
    
    # Find the virtual environment
    current_dir = Path(__file__).parent
    project_root = current_dir.parent
    venv_python = project_root / '.venv' / 'Scripts' / 'python.exe'
    
    if not venv_python.exists():
        print("❌ Virtual environment not found!")
        print("💡 Run: py -m venv .venv")
        print("💡 Then: .venv\\Scripts\\python.exe -m pip install -r backend-python-nlp\\requirements.txt")
        return 1
    
    print(f"🚀 Starting FastAPI server on port {port}...")
    print("💡 Press Ctrl+C to stop")
    
    # Start the process
    cmd = [str(venv_python), "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", port, "--reload"]
    
    try:
        # Use subprocess.run instead of Popen for simpler handling
        result = subprocess.run(cmd, cwd=current_dir)
        return result.returncode
    except KeyboardInterrupt:
        print("\n⏹️  Server stopped!")
        return 0
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())