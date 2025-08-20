
# 🔹 Lab 2: Apache Data App Installation

### Objective

The purpose of this lab was to gain hands-on experience installing and configuring a **Sumo Logic App** for Apache. Sumo Logic apps provide **out-of-the-box dashboards, saved searches, and field extractions**, making it easier for analysts to start visualizing and analyzing log data without building everything from scratch.

This lab focused on **installing the Apache Access App**, applying a **custom data filter**, and learning how to share dashboards within an organization.

---

### Key Skills Demonstrated

* Installed a **pre-built Sumo Logic application** from the App Catalog.
* Applied a **custom data filter** (`webserver_system=apache`) to map incoming Apache logs.
* Explored **predefined dashboards and saved searches** for Apache Access logs.
* Practiced **sharing dashboards and apps** across an organization for collaboration.
* Gained familiarity with **classic apps vs modern apps** in Sumo Logic.

---

### Hands-On Tasks

1. **Searched and Installed the Apache App**

   * Opened **App Catalog** from the navigation panel.
   * Entered `Apache` in the search bar.
   * Selected the **Apache App** under *Classic Apps*.
   * Clicked **Install App**, launched installation options.

2. **Configured Installation Options**

   * Named the app `Apache_<initials>` for uniqueness.
   * Selected **Enter a Custom Data Filter** and applied:

     ```
     webserver_system=apache  
     ```

     This ensured the app ingested only Apache-related logs.

3. **Confirmed Installation**

   * Clicked **Next** to finalize app setup.
   * Verified the Apache app was now visible in the **Library → Personal folder**.

4. **Shared the App with the Organization**

   * Hovered over the Apache Access app → Clicked **Details** icon.
   * Selected **Share Dashboard → Organization → Access → Share**.
   * Confirmed visibility for all org members under the **Org folder**.

5. **Explored Pre-Built Content**

   * Navigated to **Library → Personal → Apache** folder.
   * Opened **Apache - Overview Dashboard**.
   * Reviewed preconfigured panels showing metrics such as:

     * Traffic requests over time
     * Top endpoints accessed
     * Error response codes (4xx/5xx)
     * Client IP distribution

---

### Real-World Relevance

This lab directly reflects how SOC Analysts and Security Engineers:

* **Rapidly deploy integrations** for common log sources (e.g., Apache, NGINX, Windows, AWS).
* Use **pre-built dashboards** for instant visibility instead of building every visualization manually.
* Apply **custom filters** to fine-tune the data ingestion scope.
* **Collaborate across teams** by sharing dashboards and saved searches with the organization.

For example, in a real SOC:

* Pre-built Apache dashboards allow analysts to quickly spot **traffic anomalies, failed logins, suspicious IPs, or unusual request patterns**.
* Shared dashboards enable **team-wide visibility**, making it easier to coordinate during incident response.

---

📘 **Technical Note:**

* **Sumo Logic Apps** are a powerful way to accelerate log analysis. They typically include:

  * **Dashboards**: Pre-built visualizations.
  * **Saved Searches**: Common queries to filter or detect patterns.
  * **Field Extractions**: Predefined parsing for log fields (e.g., status codes, IPs).
* **Custom Data Filters** (like `webserver_system=apache`) ensure apps only process relevant logs, reducing noise and query cost.

---


---


---

# 👥 User Roles & Access Control in Sumo Logic

Sumo Logic provides **granular access controls** that allow administrators and analysts to manage how content (apps, dashboards, searches, and folders) is shared across an organization. This ensures the right people have the right level of access, supporting both **collaboration** and **security best practices**.

### Access Levels

1. **View**

   * Users can only see and use the content.
   * They cannot modify, delete, or reshare it.
   * Example use case: Give Tier 1 SOC Analysts access to dashboards without allowing edits.

2. **Edit**

   * Users can view and make changes to the content.
   * They can adjust queries, dashboards, and saved searches but cannot delete the folder or manage sharing permissions.
   * Example use case: Tier 2 Analysts who need to refine searches or create new queries.

3. **Manage**

   * Full administrative control over the content.
   * Users can view, edit, delete, and manage sharing/permissions for others.
   * Example use case: SOC Leads or Admins responsible for maintaining shared apps and dashboards.

---

### Advanced Access Options

* **Grant Access & View Access**: Allows users not only to access but also to **further delegate access** to others.
* **Granular Role Assignment**: Permissions can be applied at the **organization level**, **role level**, or to **specific users**.
* **Notification Options**: Owners can choose to notify users via email when access is shared.

---

### Example from Apache App Sharing

* **Entire Organization (Sumo)** → Given **View** rights (all users can see dashboards, no edits).
* **Training\_Analyst Role** → Given **Edit** rights (can modify dashboards and queries).
* **John Merideth (Individual User)** → Given **Manage** rights (can edit, manage sharing, and control access for others).

---

### Real-World Relevance

In a SOC environment, **role-based access control (RBAC)** is crucial:

* Prevents unauthorized modification of critical dashboards and searches.
* Ensures junior analysts can use tools without accidentally disrupting shared resources.
* Gives senior analysts/admins the ability to maintain, update, and share content across the team.

This access model aligns with **least privilege principles** in cybersecurity, ensuring users only have as much control as needed for their role.

---


✅ **Next Step:**
With the **Apache Data App** installed and configured, I can now:

* Begin **exploring queries and filters** on Apache logs.
* Leverage **dashboards for incident detection**.
* Build **alerts and insights** from predefined searches.


⚡ This lab demonstrates how pre-built apps in Sumo Logic can **save time, improve visibility, and standardize monitoring**—key capabilities for SOC operations.

