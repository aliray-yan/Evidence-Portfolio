from utils.save import save_result
import socket

def lookup(target):
    print("\n[Reverse DNS Lookup]")
    try:
        host = socket.gethostbyaddr(target)
        result = f"Domain: {host[0]}"
        print(result)
        save_result("Reverse DNS Lookup", result)  # Save the result to CSV
    except Exception as e:
        print(f"Reverse DNS lookup failed: {e}")
        save_result("Reverse DNS Lookup", f"Failed: {str(e)}")
