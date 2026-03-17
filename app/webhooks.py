from fastapi import APIRouter, Request
from modules.whatsapp.message_handler import handle_message

router = APIRouter()


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """
    Webhook endpoint for Twilio WhatsApp messages.
    
    Called by Twilio when a customer sends a WhatsApp message.
    Routes the message through the RAG pipeline and sends response back.
    """
    payload = await request.json()
    
    # Process the incoming message
    result = handle_message(payload)
    
    return {
        "status": "received",
        "processing_result": result
    }
