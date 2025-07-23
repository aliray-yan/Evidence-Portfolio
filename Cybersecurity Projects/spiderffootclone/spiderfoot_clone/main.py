# main.py
from core.runner import run_modules, find_email_module
from colorama import init, Fore, Style

def main():
    init(autoreset=True)
    print(Fore.CYAN + Style.BRIGHT + "=== Welcome to Your OSINT Tool ===")
    print(Fore.YELLOW + "Choose an option:")
    print(Fore.GREEN + "1. Domain/IP Lookup")
    print(Fore.GREEN + "2. Find Email by Name")

    choice = input(Fore.MAGENTA + "Enter 1 or 2: ")

    if choice == "1":
        target = input(Fore.CYAN + "\nEnter a domain or IP address: ")
        print(Fore.YELLOW + f"\n[+] Running modules for: {target}\n")
        run_modules(target)
    elif choice == "2":
        person_name = input(Fore.CYAN + "\nEnter the name of the person: ")
        print(Fore.YELLOW + f"\n[+] Finding emails for: {person_name}\n")
        find_email_module(person_name)
    else:
        print(Fore.RED + "Invalid choice. Exiting.")

if __name__ == "__main__":
    main()
