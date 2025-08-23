# 🔍 Nmap Network Scanning Project

## 📌 Overview

This project demonstrates the use of **Nmap (Network Mapper)**, a powerful open-source tool for network discovery and security auditing. Nmap helps identify live hosts, open ports, running services, and potential vulnerabilities within a target network.

---

## ⚙️ Lab Environment

* **Operating System:** Kali Linux VM
* **Tool:** Nmap
* **Target:** Local network & test VMs

---

## 🏗️ Project Steps

### 1️⃣ Basic Host Discovery

Check which hosts are live in the subnet:

```bash
nmap -sn 192.168.1.0/24
```

---

### 2️⃣ Port Scanning

Scan a specific host for open ports:

```bash
nmap 192.168.1.10
```

Scan all TCP ports:

```bash
nmap -p- 192.168.1.10
```

---

### 3️⃣ Service & Version Detection

Identify services running on open ports:

```bash
nmap -sV 192.168.1.10
```

---

### 4️⃣ OS Detection

Attempt to fingerprint the target OS:

```bash
nmap -O 192.168.1.10
```

---

### 5️⃣ Vulnerability Scripts (NSE)

Use Nmap Scripting Engine to check for common vulnerabilities:

```bash
nmap --script vuln 192.168.1.10
```

---

## 📊 Example Output

```
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 7.6p1 Ubuntu 4ubuntu0.7
80/tcp   open  http    Apache httpd 2.4.29 ((Ubuntu))
443/tcp  open  ssl/https
```

---

## 🎯 Skills Practiced

* Network discovery and reconnaissance
* Port scanning and service enumeration
* OS fingerprinting
* Using Nmap Scripting Engine (NSE) for vulnerability detection
* Analyzing scan results for potential security issues

---

## 🚀 Future Enhancements

* Automate scans with Bash or Python scripts
* Export results to formats like XML or HTML for reporting
* Integrate Nmap with IDS/IPS tools (e.g., Suricata, Snort)
* Combine with **Vulnerability Scanners (Nessus, OpenVAS)** for deeper analysis