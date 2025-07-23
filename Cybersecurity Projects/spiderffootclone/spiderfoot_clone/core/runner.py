from modules import dns_lookup, whois_lookup, reverse_dns_lookup, ip_geolocation, port_scanner, email_finder



def run_modules(target):
    dns_lookup.lookup(target)
    whois_lookup.lookup(target)
    reverse_dns_lookup.lookup(target)
    ip_geolocation.lookup(target)
    port_scanner.scan_ports(target)

def find_email_module(person_name):
    email_finder.find_emails(person_name)
