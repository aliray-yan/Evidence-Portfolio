
## Lab 5: Data Monitoring & Alerting

In this lab, I focused on **automating log monitoring through scheduled searches and alerts**. After gaining the ability to search and parse logs in previous labs, I applied that knowledge to create proactive monitoring in **Sumo Logic**. Alerts ensure that analysts don’t have to constantly query data manually; instead, the SIEM notifies us when specific conditions or trends occur.

---

### Steps Taken

1. **Open Search from Dashboard**

   * From the **Visitor Locations panel** in the *Apache Overview dashboard*, I opened the underlying query in Search.

2. **Save and Schedule the Search**

   * Used the **Save As → Scheduled Search** option.
   * Chose a **Run Frequency of every 15 minutes**, meaning the query executes at `:00, :15, :30, :45`.

3. **Configure Alert Parameters**

   * **Time Range:** Last 3 Hours.
   * **Timezone:** Defaulted to GMT-8:00 (useful when source logs are in other timezones).
   * **Notification:** Send results *every time the search completes*.
   * **Alert Type:** Email.
   * **Recipients:** Configured with my email.
   * **Email Subject:** Used variables for clarity:

     ```
     {{SearchName}} {{FireTime}} {{NumRawResults}}
     ```

     This ensures each alert includes the search name, execution time, and number of raw results.
   * **Attachment:** Results included as a **CSV file** for easier offline review (limited to 5MB or 1,000 rows).

4. **Save and Activate**

   * After saving, the system began delivering **email alerts every 15 minutes** with structured results.

5. **Disabling the Alert**

   * To stop notifications, I simply edited the scheduled search and set the **Run Frequency to “Never.”**

---

### Key Takeaways

* **Proactive Monitoring:** Instead of pulling data manually, the SIEM continuously monitors patterns and pushes notifications.
* **Automation & Efficiency:** Scheduled searches save time, ensure consistency, and reduce the chance of missing critical activity.
* **Professional Alerting Practices:**

  * Using variables in subject lines improves context.
  * CSV attachments enable quick triage without logging into the SIEM.
  * Clear scheduling ensures alerts arrive with predictable timing.

---

✅ With this lab, I demonstrated the ability to configure automated alerts — a **core SOC analyst skill**. Alerts form the backbone of incident detection workflows, ensuring timely awareness of anomalies and threats.
