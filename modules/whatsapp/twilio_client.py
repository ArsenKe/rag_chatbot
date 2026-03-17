"""Twilio WhatsApp client for sending and receiving messages"""

from typing import Dict, Optional
from twilio.rest import Client
from app.core.config import settings


class TwilioWhatsAppClient:
    """Twilio client wrapper for WhatsApp integration"""
    
    def __init__(self):
        """Initialize Twilio client with credentials from settings"""
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            raise ValueError("Twilio credentials not configured")
        
        self.client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN
        )
        self.whatsapp_number = settings.TWILIO_WHATSAPP_NUMBER
    
    def send_message(
        self,
        to: str,
        body: str,
        media_url: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Send a WhatsApp message via Twilio.
        
        Args:
            to: Recipient WhatsApp number (e.g., "+49123456789")
            body: Message text
            media_url: Optional URL to media attachment
        
        Returns:
            Response dict with message SID and status
        """
        try:
            message_kwargs = {
                'from_': f"whatsapp:{self.whatsapp_number}",
                'to': f"whatsapp:{to}",
                'body': body
            }
            
            if media_url:
                message_kwargs['media_url'] = [media_url]
            
            message = self.client.messages.create(**message_kwargs)
            
            return {
                'status': 'sent',
                'message_sid': message.sid,
                'to': to,
                'body': body
            }
        
        except Exception as e:
            print(f"Error sending WhatsApp message: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'to': to
            }
    
    def send_booking_link(
        self,
        to: str,
        message: str,
        booking_url: str = "https://www.royal-ecars.com/book-online"
    ) -> Dict[str, str]:
        """Send message with booking link."""
        full_message = f"{message}\n\n🔗 Buchen Sie jetzt: {booking_url}"
        return self.send_message(to, full_message)


# Singleton instance
_twilio_client = None


def get_twilio_client() -> TwilioWhatsAppClient:
    """Get or create Twilio client instance"""
    global _twilio_client
    if _twilio_client is None:
        _twilio_client = TwilioWhatsAppClient()
    return _twilio_client


def send_message(to: str, body: str) -> Dict[str, str]:
    """Convenience function to send message"""
    client = get_twilio_client()
    return client.send_message(to, body)
