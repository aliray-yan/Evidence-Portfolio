# 📘 Sumo Logic Labs – README

## Introduction

This repository documents a series of **hands-on labs with Sumo Logic**, focusing on skills essential for a **SOC (Security Operations Center) Analyst**. Each lab demonstrates a core capability of Sumo Logic, from log management and parsing to user roles, access control, and dashboard visualization.

The labs are structured to not only provide **step-by-step walkthroughs**, but also to explain the **importance of each activity in real-world SOC operations**. By the end of these labs, the reader will understand how to effectively use Sumo Logic for log analysis, threat detection, and reporting.

---

## 📂 Labs Overview

### **Lab 5.2 – User Roles and Access Levels**

* **What it covers:** How to configure and manage user roles in Sumo Logic.
* **Why it matters:** Role-based access control (RBAC) is essential for security, ensuring users only access the data and features required for their role. Misconfigured access can lead to insider threats or compliance violations.
* **Key Takeaways:**

  * Difference between **Administrator, Analyst, and Read-only** roles.
  * Best practices for implementing **least privilege** in a SOC environment.

---

### **Lab 5.3 – Log Parsing and Field Extraction**

* **What it covers:** How to parse raw log data into structured fields that can be queried, aggregated, and visualized.
* **Why it matters:**

  * **Unparsed logs** are raw text, difficult to search and analyze.
  * **Parsed logs** break data into fields (e.g., timestamp, IP, username, status code). This enables **faster searches, accurate filtering, advanced queries, and powerful visualizations**.
* **Hands-On Steps:**

  1. Ingested sample logs into Sumo Logic.
  2. Applied a parsing rule to extract **status codes, IP addresses, and request methods**.
  3. Validated parsing results using log search queries.
  4. Built queries on top of parsed fields (e.g., count by `status_code`, top `client_ip`).
* **Key Takeaway:** Parsing is the **foundation of SIEM effectiveness**. Without structured data, dashboards, alerts, and analytics lose accuracy. A SOC analyst’s ability to parse correctly directly impacts **incident detection and response speed**.

---

### **Lab 6 – Data Visualization with Dashboards**

* **What it covers:** Creating, customizing, and managing dashboards in Sumo Logic.
* **Why it matters:** Dashboards are critical for **real-time monitoring** and **incident detection**. They allow SOC analysts to correlate log and metric data, identify anomalies, and present findings in an understandable format.
* **How it was done (my method):**

  * Ran a query in **Log Search** for Apache logs.
  * Counted results by **status code**.
  * Switched to **Aggregate view** and added results directly to a personal dashboard.
* **Key Takeaway:** Dashboards turn raw log searches into **clear, visual insights**, improving both detection and communication with non-technical stakeholders.

---

## 🔑 Why These Labs Are Important for SOC Analysts

Each lab builds a different layer of SOC analyst skills:

* **User Roles (Access Control):** Enforces security at the platform level.
* **Log Parsing:** Converts noisy, unstructured data into **actionable intelligence**.
* **Dashboards:** Enables visualization, trend analysis, and reporting.

Together, they form the foundation of **effective SIEM operations** in any enterprise environment.

---

## 📌 Hosted vs Installed (Cloud vs On-Premises Sumo Logic)

Sumo Logic can be used in two main ways, and it’s important to understand the difference:

* **Hosted (Cloud-native):**

  * Managed entirely by Sumo Logic.
  * Scalable, no infrastructure to maintain.
  * Best for teams that want quick deployment and continuous updates.

* **Installed (On-Premises/Hybrid):**

  * Deployed within an organization’s infrastructure.
  * Provides more control and compliance flexibility.
  * Requires internal resources to manage and maintain.

**Professional Note:** Most modern SOCs use **cloud-native Sumo Logic**, but regulated industries (finance, defense) may opt for hybrid/on-premises deployments for compliance reasons.

---

## 🚀 Final Note

This repository demonstrates not just how to use Sumo Logic, but **why each function matters for cybersecurity professionals**. By following these labs, a reader will gain both the **practical skills** and the **professional reasoning** behind common SOC workflows.

