from utils.save import save_result
import whois

def lookup(target):
    print("\n[WHOIS Lookup]")
    try:
        w = whois.whois(target)
        result = f"domain_name: {w.domain_name}\n"
        result += f"registrar: {w.registrar}\n"
        result += f"registrar_url: {w.registrar_url}\n"
        result += f"reseller: {w.reseller}\n"
        result += f"updated_date: {w.updated_date}\n"
        result += f"creation_date: {w.creation_date}\n"
        result += f"expiration_date: {w.expiration_date}\n"
        result += f"name_servers: {w.name_servers}\n"
        result += f"status: {w.status}\n"
        result += f"emails: {w.emails}\n"
        result += f"dnssec: {w.dnssec}\n"
        result += f"name: {w.name}\n"
        result += f"org: {w.org}\n"
        result += f"address: {w.address}\n"
        result += f"city: {w.city}\n"
        result += f"state: {w.state}\n"
        result += f"registrant_postal_code: {w.registrant_postal_code}\n"
        result += f"country: {w.country}\n"
        
        print(result)  # Debug print
        save_result("WHOIS Lookup", result)  # Save the result to CSV
    except Exception as e:
        print(f"WHOIS lookup failed: {e}")
        save_result("WHOIS Lookup", f"Failed: {str(e)}")
