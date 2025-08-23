 🐝 Week 5: Honeypot and Canary Token Monitoring

## 📌 Overview

In this project, I set up and monitored a **Cowrie SSH honeypot** and experimented with **Canary Tokens** to detect unauthorized access attempts.
This combines **deception technology** with **real-time alerts**, giving valuable insights into attacker behaviors.

---

## ⚙️ Lab Environment

* **VM:** Kali Linux (VirtualBox / VMware)
* **Honeypot:** [Cowrie](https://github.com/cowrie/cowrie)
* **Canary Tokens:** [canarytokens.org](https://canarytokens.org/nest/)
* **Alert Channel:** Email

---

## 🏗️ Honeypot Setup (Cowrie)

### 1️⃣ Install Dependencies

```bash
sudo apt-get update && sudo apt-get install git python3-virtualenv -y
```

### 2️⃣ Clone Cowrie

```bash
git clone https://github.com/cowrie/cowrie.git
cd cowrie
```

### 3️⃣ Virtual Environment Setup

```bash
virtualenv -p python3 cowrie-env
source cowrie-env/bin/activate
pip install -r requirements.txt
```

### 4️⃣ Configure Cowrie

```bash
cp etc/cowrie.cfg.dist etc/cowrie.cfg
nano etc/cowrie.cfg   # (Optional: Change SSH port from 2222 → 22)
```

### 5️⃣ Start Honeypot

```bash
cowrie start
cowrie status
```

Verify it’s listening:

```bash
netstat -tuln | grep 2222
```

### 6️⃣ Simulate Attack

```bash
ssh username@localhost -p 2222
```

### 7️⃣ View Logs

```bash
cd var/log/cowrie
tail -f cowrie.log
```

### 8️⃣ Stop Honeypot

```bash
cowrie stop
```

---

## 🏗️ Canary Token Setup

### 1️⃣ Generate Token

* Visit [canarytokens.org](https://canarytokens.org/nest/)
* Select token type (e.g., **Excel file**)
* Enter email for alerts
* Download the token

### 2️⃣ Deploy Token

* Rename it to something enticing (e.g., `Passwords.xlsx`)
* Add fake data to make it realistic
* Place in a tempting folder (e.g., `Documents/Confidential/`)

### 3️⃣ Trigger & Monitor

* Open the token to simulate attacker access
* Receive email alert with details:

  * Source IP
  * User agent
  * Timestamp

---

## 📊 Example Attack Log (Cowrie)

```
2025-08-16 14:42:11+0000 [SSHService ssh-userauth on HoneyPotTransport,0,127.0.0.1] login attempt [root/12345] failed
2025-08-16 14:42:15+0000 [SSHChannel session (0) on SSHService ssh-connection] command input: uname -a
```

---

## 🏆 What I Learned

* **Deception Technology** → How honeypots & tokens lure attackers.
* **Canary Token Setup** → Building fake files that trigger real-time alerts.
* **Honeypot Monitoring** → Capturing brute force attempts & attacker commands.
* **Threat Detection Skills** → Observing attacker behavior for better defense.

---

## 🚀 Future Work

* Automate Canary Token alerts into a **SIEM (Sentinel / ELK)**.
* Use multiple honeypots (HTTP, FTP, MySQL) for broader coverage.
* Integrate SOAR workflows for **automated response**.
