# Change the function name to scan_ports
from utils.save import save_result

import socket

def scan_ports(target):
    print("\n[Port Scanner]")
    try:
        ports = [80, 443]
        open_ports = []
        for port in ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((target, port))
            if result == 0:
                open_ports.append(port)
            sock.close()
        
        result = "\n".join([f"Port {port} is open" for port in open_ports])
        print(result)
        save_result("Port Scanner", result)
    except Exception as e:
        print(f"Port scanner failed: {e}")
        save_result("Port Scanner", f"Failed: {str(e)}")
