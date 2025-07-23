# modules/email_finder.py
import requests
from bs4 import BeautifulSoup
from utils.save import save_result
from modules.check_email_breach import check_breach

def find_emails(person_name):
    print("\n[Email Finder]")
    query = f'"{person_name}" email'
    url = f"https://www.google.com/search?q={query}"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }

    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        results = soup.find_all('div', class_='BNeawe s3v9rd AP7Wnd')

        emails = set()
        for result in results:
            text = result.get_text()
            for word in text.split():
                if "@" in word and "." in word:
                    emails.add(word)

        if emails:
            for email in emails:
                print(email)
                save_result("Email Finder", f"{person_name} -> {email}")
                check_breach(email)  # Check if this email is part of any breach
        else:
            print("No emails found.")

    except Exception as e:
        print(f"Error finding emails: {e}")
        save_result("Email Finder", f"{person_name} -> Failed: {e}")
