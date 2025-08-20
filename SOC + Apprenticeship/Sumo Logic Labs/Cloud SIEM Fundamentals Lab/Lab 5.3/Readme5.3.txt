Excellent — this lab is really important because it moves beyond ingestion into **data organization and tiered searching** (which is a real SOC analyst responsibility).

I’ll document **Lab 3: Data Tier Exploration** in the same structured README format, and I’ll also add a **clear explanation of Continuous, Frequent, and Infrequent tiers** for your guide.

---

# 🔹 Lab 3: Data Tier Exploration

### Objective

The purpose of this lab was to understand how **Sumo Logic organizes ingested data into Data Tiers and Partitions** for optimized searching and cost management. As an analyst, knowing how data is stored and queried is critical for conducting **efficient investigations** without overloading resources.

This lab introduced the concept of **Partitions, Data Tiers, and Search Modes** (Basic and Advanced), and applied them to investigate a simulated AWS Application Load Balancer (ALB) outage.

---

### Key Skills Demonstrated

* Navigated the **Partitions page** to review available partitions and associated data tiers.
* Learned how **data tiers improve query speed and reduce cost**.
* Performed a log search in **Basic Mode (query builder)** and transitioned it into **Advanced Mode (SQL-like query)**.
* Investigated a high-volume log source (AWS ALB logs, millions of entries).
* Applied filtering (`_sourceCategory`) and **time range selection** to scope searches effectively.

---

### Hands-On Tasks

#### 🔍 Viewing Partitions

1. Navigated to **Configuration → Logs → Partitions** (or via **Go To… → Partitions**).
2. Reviewed available **Partitions** in the environment.
3. Checked associated **Data Tiers** (Continuous, Frequent, or Infrequent).
4. Clicked a partition to view detailed metadata.

#### 🔍 Running a Search in Basic Mode

1. Opened **Logs → Log Search**.
2. Switched to **Basic Mode** using the three-dot menu.
3. Configured query parameters:

   * **Data Tier** → Continuous
   * **Filter** → `_sourceCategory = Labs/Apache/Access`
   * **Time Range** → Last 24 Hours
4. Observed raw logs to start initial investigation.

#### 🔍 Switching to Advanced Mode

1. Opened the query in **Advanced Mode** (SQL-like syntax).
2. Verified the auto-generated query matched the Basic Mode search.
3. Confirmed identical results, demonstrating how both query modes interoperate.

---

### Data Tiers in Sumo Logic

Data Tiers determine **how logs are stored, queried, and priced**. Selecting the correct tier ensures efficient searches and cost optimization.

* **Continuous Tier**

  * Designed for **real-time and high-value production logs**.
  * Ingests data immediately, available within seconds.
  * Best for **security investigations, live monitoring, and critical workloads**.
  * Used in this lab to investigate AWS ALB outage in real-time.

* **Frequent Tier**

  * Stores logs that are often queried but not necessarily real-time critical.
  * Lower ingestion cost than Continuous, with slight query delay.
  * Best for **dashboards, compliance monitoring, or recurring queries**.

* **Infrequent Tier**

  * Designed for **archival and rarely queried logs**.
  * Lowest storage cost, but queries are slower and may have extra retrieval costs.
  * Best for **long-term log retention (audit, forensic investigations, regulatory requirements)**.

| Tier       | Speed               | Cost    | Best Use Case                                      |
| ---------- | ------------------- | ------- | -------------------------------------------------- |
| Continuous | Real-time (seconds) | Highest | Security alerts, live investigations               |
| Frequent   | Near real-time      | Medium  | Dashboards, recurring compliance queries           |
| Infrequent | Delayed retrieval   | Lowest  | Archival, historical audits, rare forensic queries |

---

### Real-World Relevance

For SOC Analysts, understanding **partitions and data tiers** is essential because:

* Searching the wrong tier wastes resources and delays investigations.
* Continuous tier ensures immediate visibility into **active threats**.
* Frequent and Infrequent tiers reduce **operational costs** while still preserving security visibility.
* Using Basic Mode helps junior analysts quickly build queries, while Advanced Mode gives senior analysts **full control** over search syntax.

In this lab’s scenario, limiting the search to the **Continuous tier** prevented unnecessary scanning of historical or infrequent data — saving time during a simulated AWS ALB outage investigation.

---

✅ **Next Step:**
The next labs will build on this by refining searches, applying sorting and filtering, and eventually correlating logs into **dashboards, alerts, and SIEM insights**.

---