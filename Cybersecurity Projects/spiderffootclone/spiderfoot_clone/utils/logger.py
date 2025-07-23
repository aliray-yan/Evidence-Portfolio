def log(message):
    print(f"[LOG]: {message}")
import csv

def save_result(data, filename="results.csv"):
    with open(filename, mode='a', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(data)
