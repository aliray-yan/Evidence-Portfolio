# 🛡️ Suricata IDS Project

## 📌 Overview

This project demonstrates how to set up and use **Suricata**, an open-source Intrusion Detection System (IDS) and Intrusion Prevention System (IPS). Suricata monitors network traffic in real time and generates alerts for suspicious or malicious activity.

---

## ⚙️ Lab Environment

* **Operating System:** Kali Linux VM
* **Tool:** Suricata IDS
* **Traffic Simulation:** ICMP (Ping) tests

---

## 🏗️ Setup Steps

### 1️⃣ Install Suricata

On Kali Linux:

```bash
sudo apt update && sudo apt install suricata -y
```

Verify installation:

```bash
suricata --version
```

---

### 2️⃣ Run Suricata in IDS Mode

Start Suricata with the default config:

```bash
sudo suricata -c /etc/suricata/suricata.yaml -i eth0
```

*(Replace `eth0` with your network interface name, e.g., `ens33` or `wlan0`)*

---

### 3️⃣ Generate Network Traffic

Simulate traffic by pinging an external IP (Google DNS):

```bash
ping -c 4 8.8.8.8
```

---

### 4️⃣ Check Suricata Logs

Suricata stores logs in `/var/log/suricata/`.

* **Alerts in JSON format:**

```bash
sudo cat /var/log/suricata/eve.json | grep "alert"
```

* **Fast log (human-readable):**

```bash
sudo tail -f /var/log/suricata/fast.log
```

You should see alerts like **ICMP Ping Detected**.

---

## 📊 Example Output (fast.log)

```
08/16/2025-15:45:12.123456  [**] [1:2100498:9] ET POLICY ICMP Ping Detected [**]
[Classification: Misc activity] [Priority: 3] {ICMP} 192.168.1.10 -> 8.8.8.8
```

---

## 🎯 Skills Practiced

* Installing and configuring Suricata IDS
* Monitoring network traffic in real time
* Detecting ICMP traffic using Suricata rules
* Analyzing Suricata logs (`eve.json`, `fast.log`)

---

## 🚀 Future Enhancements

* Enable Suricata in **IPS mode** (to block malicious traffic)
* Write and test **custom detection rules**
* Forward Suricata logs to a SIEM (e.g., Elastic SIEM, Splunk, or Microsoft Sentinel)
* Expand traffic tests (e.g., Nmap scans, malicious file transfers)

