This README will include:

* Intro to the labs
* Lab structure (Objective → Skills → Tasks → Relevance)
* Technical notes (Hosted vs Installed Collectors, Sources, Metadata, etc.)
* A framework so you can keep adding each lab


# Sumo Logic Labs – SOC Analyst Hands-On Guide

This repository documents my hands-on experience with **Sumo Logic Labs** as part of my journey in **SOC operations, SIEM management, and log analysis**.
Each lab simulates **real-world SOC workflows**, helping me build practical skills in data collection, monitoring, and threat detection.

---

## 📌 Lab Format

Each lab is documented with the following structure:

* **Objective** – What the lab is designed to teach.
* **Key Skills Demonstrated** – The SOC-relevant skills applied.
* **Hands-On Tasks** – Step-by-step actions taken in the lab.
* **Real-World Relevance** – Why these tasks matter in professional SOC environments.

---

# 🔹 Lab 1: Data Collection

### Objective

The goal of this lab was to gain hands-on experience in **data ingestion monitoring and validation** within **Sumo Logic**. A SOC Analyst must ensure that security-relevant data is properly collected, categorized, and available for queries.

### Key Skills Demonstrated

* Verified **log ingestion health** using the Collection page.
* Differentiated between **Hosted vs Installed Collectors**.
* Identified **sources** and their configured metadata (e.g., `sourceCategory`).
* Analyzed ingestion **graphs and message counts**.
* Used filters to manage collector visibility.

### Hands-On Tasks

1. **Navigated to the Collection Page**

   * Accessed via **Configuration → Data Collection** or **Go To… → Collection**.

2. **Searched for Collectors and Sources**

   * Used exact keywords (e.g., `Labs - Apache`) and wildcards (`Labs*`).

3. **Reviewed Collector Details**

   * Health: Confirmed **Healthy** status (color-coded green).
   * Type: Verified collector type (**Hosted**).
   * Sources: Checked number of sources configured.
   * Source Category: Inspected metadata for categorization (`labs/apache/access`).

4. **Analyzed Log Ingestion**

   * Viewed graphs showing per-minute log ingestion.
   * Verified total log messages (e.g., `20,886` logs received for Apache).

5. **Explored Filtering Options**

   * **Show:** All, Installed, Hosted, Running, Stopped Collectors.
   * **Show up to:** Adjusted visible collectors (10, 25, 50, etc.).
   * **Expand/Collapse:** Toggled details for each collector.

### Real-World Relevance

In professional SOC environments:

* Analysts must **validate log pipelines** to ensure visibility across servers, applications, and network devices.
* Metadata like **sourceCategory** is essential for building efficient queries and dashboards.
* Detecting ingestion issues early prevents **blind spots in security monitoring**.

This lab directly reflects the daily workflow of **Tier 1 SOC Analysts** verifying log health before deeper threat detection work.

---

# 📘 Technical Notes: Collectors, Sources, Metadata

### Collectors in Sumo Logic

Collectors are agents or services responsible for **ingesting log and metric data** into Sumo Logic.

* **Hosted Collectors**

  * Cloud-based, no local installation needed.
  * Best for ingesting data from **cloud services** (AWS, GCP, Azure, SaaS apps).
  * Managed by Sumo Logic (no patching/maintenance required).

* **Installed Collectors**

  * Deployed on-premises or on servers (Linux/Windows).
  * Best for collecting logs from **local files, syslog, application servers**.
  * Offers more granular control (file paths, OS-level data).

| Feature       | Hosted Collector    | Installed Collector         |
| ------------- | ------------------- | --------------------------- |
| Location      | Cloud (Sumo-hosted) | On-premise/server           |
| Setup         | Quick, no install   | Requires agent installation |
| Best Use Case | Cloud service logs  | Local servers, syslog, apps |
| Maintenance   | Managed by Sumo     | Customer-managed            |

---

### Sources

A **Source** defines *what* data is collected by a Collector. Examples:

* Apache Access Logs
* Windows Event Logs
* Syslog Streams
* AWS CloudTrail

Each Source is tied to metadata (like `sourceCategory`) to help organize and query logs.

---

### Metadata in Sumo Logic

Metadata is critical for **querying and filtering logs**.

* **sourceCategory**: Logical grouping of logs (e.g., `labs/apache/access`).
* **sourceName**: Name assigned to the source.
* **host**: Identifies the originating system.

Analysts rely on metadata to build queries such as:

```sql
_sourceCategory=labs/apache/access | count by host
```

---

# ✅ Next Steps

This was **Lab 1: Data Collection**.
Upcoming labs will cover:

* Log searching and filtering
* Creating dashboards
* Building alerts
* Working with Cloud SIEM insights
