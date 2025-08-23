# 🖧 Cisco Packet Tracer – Basic LAN Setup

## 📌 Overview

This project demonstrates a **basic Local Area Network (LAN)** using **Cisco Packet Tracer**. The goal is to connect two PCs through a switch, assign IP addresses, and verify network connectivity with `ping`.

---

## ⚙️ Lab Environment

* **Software:** Cisco Packet Tracer
* **Devices Used:**

  * 1 Switch (SW1)
  * 2 PCs (PC1, PC2)

---

## 🏗️ Setup Steps

### 1️⃣ Design the Topology

* Place **two PCs** and **one switch** in the workspace.
* Connect both PCs to the switch using **copper straight-through cables**.

### 2️⃣ Assign IP Addresses

* PC1: `192.168.1.10 / 24`
* PC2: `192.168.1.20 / 24`
* No default gateway needed (same network).

### 3️⃣ Test Connectivity

* On PC1, open the Command Prompt and run:

```bash
ping 192.168.1.20
```

* On PC2, test back:

```bash
ping 192.168.1.10
```

If both replies are successful, the LAN is working correctly ✅.

---

## 🎯 Skills Practiced

* Basic LAN design in Packet Tracer
* IP addressing and subnetting
* Switch and end-device connectivity
* Network testing with `ping`

---

## 🚀 Future Enhancements

* Add more PCs to expand the LAN
* Configure a router to connect multiple networks
* Implement DHCP to auto-assign IPs
* Add VLANs for segmentation
