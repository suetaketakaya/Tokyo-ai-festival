#!/usr/bin/env python3
"""
W&B ML Model - FastAPI Server
High-Performance Persistent ML Prediction Service

Benefits:
- Model loaded once at startup (eliminates 300ms overhead)
- HTTP/JSON API (language-agnostic)
- Expected latency: 1154ms → 850ms (-26%)
- Concurrent request handling
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn
import sys
import os
import logging

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the ML model
from wandb_local_model import RemoteClaudeMLModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Pydantic Models
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ClaudeCliResult(BaseModel):
    """Claude CLI result structure"""
    command_type: Optional[str] = None
    confidence: Optional[float] = None
    language: Optional[str] = None
    framework: Optional[str] = None


class PredictionRequest(BaseModel):
    """Request structure for ML prediction"""
    command: str
    claude_result: Optional[ClaudeCliResult] = None


class PredictionResponse(BaseModel):
    """Response structure for ML prediction"""
    command_type: str
    confidence: float
    ml_category: str
    ml_confidence: float
    category_probabilities: Dict[str, float]
    claude_category: Optional[str] = None
    claude_confidence: Optional[float] = None
    timestamp: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    version: str
    categories: list


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FastAPI Application
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app = FastAPI(
    title="RemoteClaudeOPS ML API",
    description="High-performance ML prediction API for command classification",
    version="1.0.0"
)

# CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Global Model Instance (loaded once at startup)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ml_model: Optional[RemoteClaudeMLModel] = None


@app.on_event("startup")
async def startup_event():
    """Load ML model at server startup"""
    global ml_model
    logger.info("🚀 Starting RemoteClaudeOPS ML API Server...")
    logger.info("📦 Loading ML models...")

    try:
        ml_model = RemoteClaudeMLModel()
        logger.info("✅ ML models loaded successfully")
        logger.info(f"📊 Categories: {ml_model.categories}")
    except Exception as e:
        logger.error(f"❌ Failed to load ML models: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on server shutdown"""
    logger.info("🛑 Shutting down RemoteClaudeOPS ML API Server...")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# API Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - health check"""
    return {
        "status": "running",
        "model_loaded": ml_model is not None,
        "version": "1.0.0",
        "categories": ml_model.categories if ml_model else []
    }


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    if ml_model is None:
        raise HTTPException(status_code=503, detail="ML model not loaded")

    return {
        "status": "healthy",
        "model_loaded": True,
        "version": "1.0.0",
        "categories": ml_model.categories
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    ML prediction endpoint

    Args:
        request: PredictionRequest with command and optional Claude result

    Returns:
        PredictionResponse with predicted category and confidence
    """
    if ml_model is None:
        raise HTTPException(status_code=503, detail="ML model not loaded")

    logger.info(f"🔮 Prediction request: {request.command[:60]}...")

    try:
        # Convert Pydantic model to dict for ML model
        claude_result_dict = None
        if request.claude_result:
            claude_result_dict = request.claude_result.dict(exclude_none=True)

        # Perform prediction
        result = ml_model.predict(request.command, claude_result_dict)

        logger.info(f"✅ Prediction: {result['command_type']} ({result['confidence']:.2f})")

        return PredictionResponse(**result)

    except Exception as e:
        logger.error(f"❌ Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/categories")
async def get_categories():
    """Get list of available categories"""
    if ml_model is None:
        raise HTTPException(status_code=503, detail="ML model not loaded")

    return {
        "categories": ml_model.categories,
        "count": len(ml_model.categories)
    }


@app.post("/retrain")
async def retrain(feedback_file: str):
    """
    Retrain model from feedback file

    Args:
        feedback_file: Path to JSON file with training examples

    Returns:
        Success message
    """
    if ml_model is None:
        raise HTTPException(status_code=503, detail="ML model not loaded")

    logger.info(f"🔄 Retraining from: {feedback_file}")

    try:
        ml_model.retrain_from_feedback_file(feedback_file)
        logger.info("✅ Retraining completed")
        return {"status": "success", "message": "Model retrained successfully"}
    except Exception as e:
        logger.error(f"❌ Retraining error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate")
async def evaluate(feedback_file: str):
    """
    Evaluate model accuracy on feedback file

    Args:
        feedback_file: Path to JSON file with evaluation examples

    Returns:
        Evaluation metrics
    """
    if ml_model is None:
        raise HTTPException(status_code=503, detail="ML model not loaded")

    logger.info(f"📊 Evaluating on: {feedback_file}")

    try:
        result = ml_model.evaluate_on_feedback(feedback_file)
        logger.info(f"✅ Evaluation: {result['accuracy']:.1f}% ({result['correct']}/{result['total']})")
        return result
    except Exception as e:
        logger.error(f"❌ Evaluation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main Entry Point
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main():
    """Start FastAPI server"""
    import argparse

    parser = argparse.ArgumentParser(description="RemoteClaudeOPS ML API Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--workers", type=int, default=1, help="Number of workers")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")

    args = parser.parse_args()

    logger.info(f"🌐 Starting server on {args.host}:{args.port}")

    uvicorn.run(
        "wandb_api_server:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        reload=args.reload,
        log_level="info"
    )


if __name__ == "__main__":
    main()
