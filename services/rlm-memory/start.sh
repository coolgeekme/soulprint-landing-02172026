#!/bin/bash
# Start the RLM Memory Service

cd "$(dirname "$0")"

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    pip install -e ../../lib/rlm-core
else
    source venv/bin/activate
fi

# Load environment variables from root .env.local
if [ -f "../../.env.local" ]; then
    export $(grep -v '^#' ../../.env.local | xargs)
fi

echo "🧠 Starting RLM Memory Service..."
python main.py
