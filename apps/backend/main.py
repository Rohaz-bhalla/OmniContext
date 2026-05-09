import os
import shutil
from typing import TypedDict, Annotated
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import our custom services
from services.ingestion import process_drive_folder
from services.chat import get_answer

# We'll use these later for the Unbiased AI decision loop
from langgraph.graph import StateGraph, END

load_dotenv()

app = FastAPI(title="OmniContext AI Engine", description="Unbiased Drive-RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS ---
class IngestRequest(BaseModel):
    folder_id: str

class ChatRequest(BaseModel):
    question: str

# --- HEALTH ROUTES ---
@app.get("/")
async def root():
    return {"status": "online", "message": "LangGraph/FastAPI engine is running successfully."}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

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
        # Note: Ensure process_drive_folder also handles the logic 
        # of saving chunks to the Chroma DB.
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