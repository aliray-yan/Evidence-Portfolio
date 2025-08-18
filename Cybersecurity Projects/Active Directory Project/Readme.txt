# 🛡️ Active Directory Home Lab

## 📌 Overview

This project demonstrates how to set up and configure a basic **Active Directory (AD) environment** in a home lab. It simulates a corporate network to practice **user management, authentication, and security monitoring**.

---

## ⚙️ Lab Environment

* **Virtualization Platform:** VirtualBox / VMware
* **VMs Used:**

  * Windows Server 2019 → Domain Controller
  * Windows 10 → Client Machine
* **Domain Name:** `corp.local`
* **Network Type:** Internal Network

---

## 🏗️ Setup Steps

### 1️⃣ Install Windows Server 2019

* Install the OS on a VM.
* Assign a **static IP** (e.g., `192.168.10.10`).
* Rename the server (e.g., `DC1`).

### 2️⃣ Install & Configure Active Directory

* Open **Server Manager → Add Roles and Features**.
* Install **Active Directory Domain Services (AD DS)**.
* Promote the server to a **Domain Controller**.
* Create a new forest: `corp.local`.

### 3️⃣ Create Organizational Units (OUs)

* Open **Active Directory Users and Computers (ADUC)**.
* Create OUs: `HR`, `IT`, `Finance`.
* Add test users inside each OU (e.g., `jane.hr`, `bob.it`).

### 4️⃣ Configure Group Policies (GPOs)

* Open **Group Policy Management Console (GPMC)**.
* Apply policies:

  * Password complexity (min length, lockout).
  * Login banner.
  * Map shared drives.
* Link policies to the correct OUs.

### 5️⃣ Setup Windows 10 Client

* Install Windows 10 in a VM.
* Set IP in the same network (e.g., `192.168.10.20`).
* Join the domain: `corp.local`.
* Log in with domain user credentials.

### 6️⃣ Security & Monitoring

* Enable **Audit Policies** (logon/logoff events).
* Check authentication logs in **Event Viewer**.
* (Optional) Forward logs to a SIEM for monitoring.

---

## 🎯 Skills Practiced

* Active Directory Domain Services (AD DS)
* User and Group Management
* Group Policy (GPOs)
* Windows Authentication & Security Policies
* Event Log Monitoring

---

## 🚀 Future Enhancements

* Add Linux machine & integrate with AD.
* Connect with Azure AD for hybrid identity.
* Send logs to **Microsoft Sentinel / Splunk / ELK**.
* Simulate attacks (brute force, pass-the-hash) for detection practice.

---

✅ This project helped me gain hands-on experience in **identity management, enterprise security, and Windows administration