# 🔎 Microsoft Sentinel SIEM Project

## 📝 Project Overview

This project demonstrates how I used **Microsoft Sentinel**, a cloud-native SIEM solution, to detect, investigate, and respond to security incidents. The goal was to simulate real-world SOC (Security Operations Center) tasks, such as ingesting logs, creating detection rules, and analyzing alerts.

By working with Microsoft Sentinel, I gained hands-on experience with **log analysis, KQL queries, incident investigation, and threat hunting**—all essential skills for a Tier 1 SOC Analyst.

---

## ⚙️ Steps to Set Up & Work on the Project

### **Step 1: Azure Setup**

* Created a **Free Azure Account**.
* Enabled **Microsoft Sentinel** in the Azure portal.
* Connected a **Log Analytics Workspace** to store logs.

### **Step 2: Connect Data Sources**

* Integrated logs from sources such as:

  * **Azure Activity Logs** (user sign-ins, resource changes).
  * **Office 365 logs** (email and user activity).
  * **Sysmon / Security Event Logs** (via agent).

### **Step 3: Create Analytics Rules**

* Built **custom detection rules** using **Kusto Query Language (KQL)** to detect suspicious activity. Examples:

  * Multiple failed login attempts.
  * Unusual geographic sign-ins.
  * Process creation events that may indicate malware.

### **Step 4: Generate Alerts & Incidents**

* Triggered test alerts by simulating failed logins.
* Verified that Sentinel created **incidents** automatically from the detection rules.

### **Step 5: Incident Investigation**

* Used **Sentinel’s Investigation Graph** to map attacker activities.
* Checked correlated logs and entities (user accounts, IPs, machines).
* Documented findings for SOC reporting.

### **Step 6: Threat Hunting with KQL**

* Ran custom KQL queries to hunt for:

  * Suspicious PowerShell commands.
  * Connections to known malicious IPs/domains.
  * Lateral movement attempts.

---

## 📂 Example KQL Queries

**Failed Sign-ins (Brute Force Attempt):**

```kql
SigninLogs
| where ResultType == "50076" or ResultType == "50057"
| summarize FailedAttempts = count() by UserPrincipalName, IPAddress, bin(TimeGenerated, 1h)
| where FailedAttempts > 5
```

**Suspicious PowerShell Execution:**

```kql
SecurityEvent
| where EventID == 4688
| where CommandLine contains "powershell"
| project TimeGenerated, NewProcessName, CommandLine, Account
```

---

## 🏆 What You Will Learn From This Project

* **SIEM Setup & Management:** Setting up Microsoft Sentinel in Azure.
* **Log Ingestion:** Connecting multiple log sources for security monitoring.
* **Detection Engineering:** Writing analytics rules with KQL.
* **Incident Response:** Investigating alerts and building SOC workflows.
* **Threat Hunting:** Using KQL queries to proactively search for threats.

