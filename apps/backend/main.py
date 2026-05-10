import os
import shutil
from typing import TypedDict, Annotated
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Import our custom services
from services.ingestion import process_drive_folder
from services.chat import get_answer

# We'll use these later for the Unbiased AI decision loop
from langgraph.graph import StateGraph, END

load_dotenv()

app = FastAPI(title="OmniContext AI Engine", description="Unbiased Drive-RAG API")

# --- CORS CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Allows local Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS ---
class IngestRequest(BaseModel):
    folder_id: str

class ChatRequest(BaseModel):
    question: str

# --- HEALTH / STATUS ROUTE ---
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "LangGraph/FastAPI engine is running successfully."}

# --- MERGED INGESTION ROUTE ---
@app.post("/api/ingest")
async def ingest_document(request: IngestRequest):
    """
    1. Wipes the old database.
    2. Downloads and chunks the Google Drive Folder.
    3. Rebuilds the vector store.
    """
    try:
        # STEP 1: Reset the Database
        persist_directory = "./chroma_db"
        if os.path.exists(persist_directory):
            shutil.rmtree(persist_directory)
            print(f"Cleared existing database at {persist_directory}")
        
        # STEP 2: Process the Folder
        chunks = process_drive_folder(request.folder_id)
        
        if not chunks:
            raise HTTPException(status_code=404, detail="Could not load folder. Check Folder ID and Permissions.")

        return {
            "status": "success",
            "message": f"Database reset and folder processed into {len(chunks)} chunks.",
            "preview_chunk": chunks[0].page_content[:200] + "..." if chunks else ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- CHAT ROUTE ---
@app.post("/api/chat")
async def chat_with_omni(request: ChatRequest):
    """
    Sends a question to the Unbiased Drive-RAG engine.
    """
    try:
        result = get_answer(request.question)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
            
        return {
            "status": "success",
            "answer": result["answer"],
            "sources": result["sources"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ====================================================================
# FRONTEND SERVING LOGIC (FOR HUGGING FACE / DOCKER DEPLOYMENT)
# This MUST be at the bottom of the file so it doesn't block /api/ routes
# ====================================================================

STATIC_DIR = "static"

# Only attempt to mount static files if the directory exists 
# (Prevents crashes during local development before the Next.js app is built)
if os.path.isdir(STATIC_DIR):
    # Mount the _next static assets explicitly
    app.mount("/_next", StaticFiles(directory=os.path.join(STATIC_DIR, "_next")), name="next_assets")
    
    # Catch-all route to serve the React UI
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        
        # If the browser is asking for a specific file (like favicon.ico), serve it
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Otherwise, serve the Next.js index.html (Handles React client-side routing)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
else:
    # Fallback for local development when the 'static' folder isn't built yet
    @app.get("/")
    async def root_fallback():
        return {
            "status": "online", 
            "message": "API running. (Next.js frontend not built yet. Build and copy 'out' to 'static' for production serving)"
        }