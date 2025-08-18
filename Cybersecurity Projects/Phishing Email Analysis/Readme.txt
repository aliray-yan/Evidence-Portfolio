# 📧 Phishing Email Honeypot Project

## 📝 Project Overview

This project focuses on building a **phishing email honeypot** to capture, analyze, and learn from real phishing attempts. By setting up a system that receives malicious emails, we can study attacker techniques, payloads, and social engineering tactics while building stronger defenses against email-based threats.

The project uses the open-source repo [phishing\_pot](https://github.com/rf-peixoto/phishing_pot) and is run in a **Kali Linux environment**.

---

## ⚙️ Steps to Set Up

### **Step 1: Clone the Repository**

```bash
git clone https://github.com/rf-peixoto/phishing_pot.git
cd phishing_pot/email
```

### **Step 2: Install Dependencies**

Make sure Python and pip are installed, then install the required dependencies:

```bash
pip install -r requirements.txt
```

### **Step 3: Configure Email Honeypot**

Edit the configuration file to set up your honeypot’s behavior:

```bash
nano config.json
```

* Set up your **SMTP listener port** (default: 25 or custom).
* Configure where captured emails will be stored (logs directory).

### **Step 4: Run the Honeypot**

Start the email honeypot:

```bash
python phishing_pot.py
```

### **Step 5: Simulate a Phishing Attack (Testing)**

You can send a test phishing-like email from another machine or using tools like `swaks`:

```bash
swaks --server 127.0.0.1 --from attacker@malicious.com --to victim@test.com --body "Click here to win a prize!"
```

### **Step 6: Analyze Captured Emails**

All received phishing emails are stored in the **logs directory** for analysis.
You can open and review them to study:

* **Email headers** (sender info, spoofed domains, etc.)
* **Links / payloads** inside the email
* **Social engineering techniques** used by attackers

---

## 📂 Log Files

Captured emails are saved in:

```
/phishing_pot/email/logs/
```

---

## 🏆 What You Will Learn From This Project

* **Email Security Awareness:** How phishing attacks are crafted and delivered.
* **Phishing Payload Analysis:** Identify links, malicious attachments, and techniques.
* **Defensive Security Skills:** Learn how organizations can detect and stop phishing attacks.
* **Hands-On SOC Experience:** Collecting, analyzing, and documenting phishing attempts like a Tier 1 SOC Analyst.

