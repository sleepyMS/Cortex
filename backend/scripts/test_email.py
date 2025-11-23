import asyncio
import sys
import os

# Add backend directory to sys.path to allow imports
# Assuming this script is in backend/scripts/
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from app.services.email_service import email_service
from app.config import settings

async def main():
    print("--- Cortex Email Verification Script ---")
    print(f"SMTP Server: {settings.EMAIL.MAIL_SERVER}")
    print(f"SMTP Port: {settings.EMAIL.MAIL_PORT}")
    print(f"Sender: {settings.EMAIL.MAIL_FROM}")
    
    to_email = input("Enter the recipient email address: ")
    
    print(f"\nSending test email to {to_email}...")
    
    try:
        success = await email_service.send_email(
            to_email=to_email,
            subject="Cortex SMTP Configuration Test",
            html_content="""
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #6a0dad;">It Works! 🎉</h2>
                <p>This email confirms that your Cortex SMTP configuration is working correctly.</p>
                <p><strong>Service:</strong> Brevo (SMTP)</p>
                <p><strong>Timestamp:</strong> Just now</p>
            </div>
            """
        )
        
        if success:
            print("\n✅ SUCCESS: Email sent successfully!")
            print("Please check your inbox (and spam folder).")
        else:
            print("\n❌ FAILED: Email service returned False.")
            
    except Exception as e:
        print(f"\n❌ ERROR: An exception occurred: {e}")

if __name__ == "__main__":
    # Windows specific event loop policy for asyncio
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(main())
