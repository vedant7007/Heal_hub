"""
Start an ngrok tunnel on port 8000 and print Twilio webhook setup instructions.
Reads config from .env file. Keeps running until Ctrl+C.
"""

import os
import sys
import time
from dotenv import load_dotenv

load_dotenv()

BACKEND_PORT = int(os.getenv("PORT", "8000"))


def main():
    try:
        from pyngrok import ngrok
    except ImportError:
        print("pyngrok is not installed. Run: pip install pyngrok")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("  Heal Hub - ngrok Tunnel")
    print("=" * 60)
    print(f"\nStarting ngrok tunnel on port {BACKEND_PORT}...")

    tunnel = ngrok.connect(BACKEND_PORT, "http")
    public_url = tunnel.public_url

    # Ensure https
    if public_url.startswith("http://"):
        public_url = public_url.replace("http://", "https://")

    webhook_url = f"{public_url}/api/webhook/whatsapp"

    print("\n" + "-" * 60)
    print(f"  ngrok tunnel is running!")
    print("-" * 60)
    print(f"\n  Public URL:  {public_url}")
    print(f"  Webhook URL: {webhook_url}")
    print(f"  Health:      {public_url}/health")
    print()
    print("-" * 60)
    print("  NOW DO THIS:")
    print("-" * 60)
    print()
    print("  1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn")
    print("  2. Click 'Sandbox settings'")
    print(f"  3. Set 'When a message comes in' to:")
    print(f"     {webhook_url}")
    print("  4. Method: POST")
    print("  5. Click Save")
    print()
    print("  Then test by sending a WhatsApp message to your")
    print("  Twilio sandbox number!")
    print()
    print("-" * 60)
    print("  Press Ctrl+C to stop the tunnel")
    print("-" * 60 + "\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down ngrok tunnel...")
        ngrok.disconnect(tunnel.public_url)
        ngrok.kill()
        print("Done.")


if __name__ == "__main__":
    main()
