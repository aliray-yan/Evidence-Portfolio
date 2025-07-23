# modules/check_email_breach.py
import requests
from utils.save import save_result

def check_breach(email):
    url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}"

    headers = {
        "User-Agent": "Mozilla/5.0",
        "hibp-api-key": "your_api_key"  # Get an API key from https://haveibeenpwned.com/API/Key
    }

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            breaches = response.json()
            if breaches:
                for breach in breaches:
                    print(f"Email: {email} -> Breached in {breach['Name']}")
                    save_result("Email Breach Check", f"{email} -> Breached in {breach['Name']}")
            else:
                print(f"Email: {email} has not been breached.")
                save_result("Email Breach Check", f"{email} -> No breach found.")
        elif response.status_code == 404:
            print(f"Email: {email} -> No breach found.")
            save_result("Email Breach Check", f"{email} -> No breach found.")
        else:
            print(f"Error checking breach for {email}: {response.status_code}")
            save_result("Email Breach Check", f"{email} -> Failed: {response.status_code}")
    except Exception as e:
        print(f"Error checking breach: {e}")
        save_result("Email Breach Check", f"{email} -> Failed: {e}")
