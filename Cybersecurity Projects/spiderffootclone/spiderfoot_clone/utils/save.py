import csv

def save_result(module_name, data, filename="data/results.csv"):
    with open(filename, mode='a', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow([module_name, data])
