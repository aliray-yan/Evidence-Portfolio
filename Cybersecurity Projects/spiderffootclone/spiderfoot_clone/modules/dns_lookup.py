import socket
from utils.save import save_result

def lookup(target):
    print("\n[DNS Lookup]")
    try:
        ip_address = socket.gethostbyname(target)
        print(f"IP Address: {ip_address}")
        save_result("DNS Lookup", f"{target} -> {ip_address}")
    except Exception as e:
        print(f"DNS lookup failed: {e}")
        save_result("DNS Lookup", f"{target} -> Failed: {str(e)}")
