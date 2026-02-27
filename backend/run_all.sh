#!/bin/bash
# Heal Hub - Start all services (Linux/macOS)
# Run from the project root: bash backend/run_all.sh

echo "============================================"
echo "  Heal Hub - Starting All Services"
echo "============================================"
echo ""

# Start ngrok in background
echo "[1/3] Starting ngrok tunnel..."
cd backend
python start_ngrok.py &
NGROK_PID=$!
cd ..

sleep 3

# Start backend in background
echo "[2/3] Starting backend server..."
cd backend
uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

sleep 2

# Start frontend
echo "[3/3] Starting frontend dev server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================"
echo "  All services running!"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "  Press Ctrl+C to stop all services"
echo "============================================"

# Cleanup on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $NGROK_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Done."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for any process to exit
wait
