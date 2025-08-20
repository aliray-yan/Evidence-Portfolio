### Lab 6: Data Visualization

In this lab, I worked with **Dashboards** to visualize key log data, focusing on Apache status codes. Instead of first creating an empty dashboard, I directly created a panel from the log search and added it to my personal dashboard.

#### Steps I Followed

1. Navigated to **Log Search** in Sumo Logic.

2. Selected the **Apache source category**.

3. Ran the following query to analyze response codes:

   ```sql
   _sourceCategory=Apache
   | count by status_code
   ```

4. Once the query results were returned, I switched to the **Aggregate tab** to view summarized counts.

5. From there, I clicked **Add to Dashboard**.

6. Selected my personal dashboard folder (with my name) and confirmed.

7. The panel was successfully added to my dashboard, now showing a clear breakdown of Apache HTTP status codes.

#### Reflection

This method shows how dashboards can be **quickly built from searches**, making it easy to go from raw log data to a visual, shareable representation without extra steps. It’s especially useful when monitoring critical metrics like status codes, where trends and anomalies can be spotted at a glance.

