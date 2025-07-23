from utils.save import save_result
import requests

def lookup(target):
    print("\n[IP Geolocation]")
    try:
        url = f"http://ip-api.com/json/{target}"
        response = requests.get(url)
        data = response.json()
        
        result = f"status: {data['status']}\n"
        result += f"country: {data['country']}\n"
        result += f"countryCode: {data['countryCode']}\n"
        result += f"region: {data['region']}\n"
        result += f"regionName: {data['regionName']}\n"
        result += f"city: {data['city']}\n"
        result += f"zip: {data['zip']}\n"
        result += f"lat: {data['lat']}\n"
        result += f"lon: {data['lon']}\n"
        result += f"timezone: {data['timezone']}\n"
        result += f"isp: {data['isp']}\n"
        result += f"org: {data['org']}\n"
        result += f"as: {data['as']}\n"
        result += f"query: {data['query']}\n"
        
        print(result)  # Debug print
        save_result("IP Geolocation", result)  # Save the result to CSV
    except Exception as e:
        print(f"IP Geolocation lookup failed: {e}")
        save_result("IP Geolocation", f"Failed: {str(e)}")
