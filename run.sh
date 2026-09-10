#!/bin/bash
echo "============================================"
echo "  SkyPredict AI - Flight Delay Prediction"
echo "============================================"
echo ""
echo "Starting Flask backend..."
cd "$(dirname "$0")"
python backend/app.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo ""
sleep 2
echo "Starting React frontend..."
cd frontend && npm start &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "============================================"
echo "  Backend: http://localhost:5000"
echo "  Frontend: http://localhost:3000"
echo "============================================"
wait
