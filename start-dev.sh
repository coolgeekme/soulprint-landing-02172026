#!/bin/bash
# Start SoulPrint development environment with memory service

echo "🚀 Starting SoulPrint Development Environment"
echo ""

# Kill any existing processes on our ports
echo "Cleaning up old processes..."
pkill -f "python main.py" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 1

# Start memory service
echo "🧠 Starting Memory Service (port 8100)..."
cd services/rlm-memory
if [ ! -d ".venv" ]; then
    echo "   Setting up Python environment..."
    uv venv --python 3.12
    source .venv/bin/activate
    uv pip install -r requirements.txt
    uv pip install -e ../../lib/rlm-core
else
    source .venv/bin/activate
fi

# Load env and start memory service in background
set -a
source ../../.env.local
set +a
python main.py > /tmp/memory-service.log 2>&1 &
MEMORY_PID=$!
cd ../..

# Wait for memory service to start
echo "   Waiting for memory service..."
for i in {1..10}; do
    if curl -s http://localhost:8100/health > /dev/null 2>&1; then
        echo "   ✅ Memory service ready"
        break
    fi
    sleep 1
done

# Start Next.js
echo "🌐 Starting Next.js (port 3000)..."
npm run dev &
NEXT_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SoulPrint is running!"
echo ""
echo "   App:     http://localhost:3000"
echo "   Memory:  http://localhost:8100"
echo ""
echo "   Logs:    /tmp/memory-service.log"
echo ""
echo "   Press Ctrl+C to stop all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Handle shutdown
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $MEMORY_PID 2>/dev/null
    kill $NEXT_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Wait for either to exit
wait
