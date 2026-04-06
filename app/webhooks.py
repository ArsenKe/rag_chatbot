from fastapi import APIRouter, Request
from pydantic import BaseModel
from modules.whatsapp.message_handler import handle_message
from modules.whatsapp.twilio_client import send_message

router = APIRouter()


class BookingConfirmationPayload(BaseModel):
    phone: str
    customer_name: str
    pickup: str
    dropoff: str
    requested_start: str
    booking_reference: str


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


@router.post("/whatsapp/send-confirmation")
async def send_booking_confirmation(payload: BookingConfirmationPayload):
    """Send outbound WhatsApp confirmation after a booking is created."""
    phone = payload.phone.strip()
    if phone.startswith("whatsapp:"):
        phone = phone.split(":", 1)[1]

    message = (
        f"Hallo {payload.customer_name}, Ihre Buchungsanfrage wurde erstellt.\n"
        f"Referenz: #{payload.booking_reference}\n"
        f"Von: {payload.pickup}\n"
        f"Nach: {payload.dropoff}\n"
        f"Start: {payload.requested_start}\n"
        "Wir melden uns bald mit der finalen Bestatigung."
    )

    result = send_message(phone, message)
    if result.get("status") != "sent":
        return {
            "status": "error",
            "message": "Failed to send WhatsApp confirmation",
            "details": result,
        }

    return {
        "status": "sent",
        "message_sid": result.get("message_sid"),
        "to": result.get("to"),
    }
