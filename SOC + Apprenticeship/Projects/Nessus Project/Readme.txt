# 🔒 Nessus Vulnerability Scanning Project

## 📌 Overview

This project demonstrates how to use **Nessus Essentials** to perform vulnerability scanning on a target system. Nessus is a widely used vulnerability assessment tool that helps identify security flaws such as outdated software, misconfigurations, and missing patches.

---

## ⚙️ Lab Environment

* **Host Machine:** Kali Linux VM
* **Target:** Localhost / Windows VM
* **Tool:** Nessus Essentials (Free version)

---

## 🏗️ Setup Steps

### 1️⃣ Install Nessus Essentials

* Download Nessus from [Tenable](https://www.tenable.com/products/nessus/nessus-essentials).
* Install Nessus on your VM or host machine.
* Start the Nessus service and access the web interface at:

```
https://localhost:8834
```

* Register with the **free activation code** provided by Tenable.

### 2️⃣ Configure a Scan

* Log in to Nessus web interface.
* Click **New Scan** → **Basic Network Scan**.
* Enter details:

  * **Name:** Localhost Scan
  * **Target:** `127.0.0.1` (or IP of target VM)

### 3️⃣ Run the Scan

* Save and launch the scan.
* Wait for Nessus to complete analysis.

### 4️⃣ Analyze Results

* Review vulnerabilities categorized by:

  * **Critical** 🔴
  * **High** 🟠
  * **Medium** 🟡
  * **Low** 🟢
* Example findings: outdated software, SSL issues, open ports.

### 5️⃣ Report Findings

* Export results as **HTML/PDF** for documentation.
* Prioritize fixing high and critical vulnerabilities first.

---

## 🎯 Skills Practiced

* Installing and configuring Nessus
* Performing vulnerability assessments
* Understanding severity levels of vulnerabilities
* Analyzing and reporting scan results

---

## 🚀 Future Enhancements

* Automate scans with scheduled tasks
* Scan external machines in a lab environment
* Integrate Nessus findings with a SIEM (e.g., Microsoft Sentinel or Elastic SIEM)
* Compare scans before and after patching to validate fixes
