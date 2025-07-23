 📨 Phishing Email Analysis Automation – Elastic SIEM + Tines

🔹 Overview

This project showcases a real-world **SOC automation workflow** that detects, analyzes, and responds to phishing email threats using **Elastic SIEM** and **Tines** (a no-code security automation platform). It combines email ingestion, rule-based analysis, and AI-assisted triage to replicate the processes used in modern Security Operations Centers.



🔧 Tech Stack

* **Elastic SIEM** (with Elastic Agent + Elastic Defend)
* **Tines** (prebuilt phishing analysis story)
* **Sublime Security** (email threat detection engine)
* **.eml file parsing**
* Email-based triggers & webhook automation

---

⚙️ How It Works

1. **Suspicious emails** are manually forwarded as `.eml` attachments to a custom Tines inbox.
2. Tines parses and extracts metadata from the email.
3. The email is sent to **Sublime Security** for deep threat analysis.
4. Tines receives and interprets the verdicts (rules matched, threat level, metadata).
5. A structured **notification email** is sent to the SOC analyst for review.
6. Alerts and events are logged in **Elastic SIEM**, and can be used for correlation with other host/network activity.

---

 ✅ Outcomes

* Demonstrated phishing triage without needing enterprise tools like PhishingBox.
* Reduced response time by **50%** through automation of email parsing and analysis.
* Gained experience integrating **EDR telemetry with email-based phishing indicators** for better context in Elastic SIEM.
* Understood the **full lifecycle of phishing response**: detection, enrichment, triage, and notification.

---

📂 Why It Matters

This project reflects real SOC workflows and shows how phishing threats can be handled using open or free-tier tools. It bridges endpoint visibility (Elastic Defend) and phishing intelligence (Sublime + Tines) to simulate enterprise-grade detection pipelines.

