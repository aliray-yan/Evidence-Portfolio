
# Lab 4: Data Searching

In this lab, you’ll learn how to search, parse, and aggregate log data in **Sumo Logic**, and then save your search results for later use.

---

## Objectives

1. Build a query in **Basic Mode**.
2. Parse and aggregate the results.
3. Save the search results.

---

## Step 1: Build a Query in Basic Mode

1. Open the **Search page**:

   * Click **Logs** → **Log Search**.
   * By default, Advanced Mode opens — switch to **Basic Mode**.

2. In the query area, set the following:

   * **Data Tier**: `Continuous`

   * **Index**: `Apache_Access1`

   * **Filters**: `_sourceCategory=Labs/Apache/Access`

   * **Keyword**: `GET`

   > Note: Keywords are **not case sensitive**.

3. Select a time range:

   * Choose **Last 60 Minutes** from the drop-down menu.
   * (Alternative: enter a relative range `-1d to -12h` or absolute times like `3/08/2022 11:00 AM to 3/08/2022 11:00 PM`).

4. Click **Start** to execute the search.

   * Results appear in the **Messages tab**.
   * Keyword **GET** will be highlighted in the logs.

---

## Step 2: Parse the Messages

Parsing helps extract specific fields from log messages to make results easier to analyze.

1. In the first result message, highlight `GET` and everything after it (URL, status code, size, and referrer).

2. Right-click → **Parse selected text**.

3. In the **Parse Text** dialog:

   * Highlight the **URL** → Click **extract value** → Name it `url,`
   * Highlight the **status code** (e.g., `200`) → Name it `status_code,`
   * Highlight the **file size** → Name it `size,`
   * Highlight the **referrer** (without quotation marks) → Name it `referrer`

4. Click **Submit**.

The parser automatically adds the following query in **Advanced Mode**:

```sql
_sourceCategory=Labs/Apache/Access and GET
| parse "\"GET * HTTP/1.1\" * * \"*\" " as url,status_code,size,referrer
```

5. Click **Start** to run the query.

   * Fields (`url`, `status_code`, `size`, `referrer`) are now extracted alongside the raw message text.

---

## Step 3: Save the Search

1. Click the **More Actions** icon → **Save As**.
2. Enter a name: e.g., **Apache Status Codes**.

   * (Optional) Add a description.
   * The query and time range auto-fill but can be edited.
3. Select a save location:

   * By default, searches save to your **Personal folder**.
   * Or choose a subfolder / create a new folder.
4. Click **Save**.

   * The saved search now appears in your **Library** and the **top tab bar**.

---

## Summary

In this lab, you successfully:
✅ Built a search query in Basic Mode.
✅ Parsed fields (`url`, `status_code`, `size`, `referrer`) for easier interpretation.
✅ Saved your search for future use.




Here’s a professional-style write-up you can add after your Lab 4 README section:

---

### Parsed vs. Unparsed Logs

**Unparsed Logs**
Unparsed logs are the raw log entries collected directly from systems, applications, or network devices. They typically contain valuable information, but it is embedded in unstructured or semi-structured text. While unparsed logs provide the complete picture, they are harder to read, analyze, or correlate at scale. For example, in Apache logs, the request method, URL, status code, and referrer are all mixed together in a single line of text, making it difficult to filter or aggregate without additional processing.

**Parsed Logs**
Parsed logs are logs that have been processed to extract specific fields of interest (e.g., `url`, `status_code`, `size`, `referrer`) and transform them into structured data. This allows analysts and SIEM platforms to query, visualize, and correlate information more efficiently. Parsing turns unstructured log lines into well-defined attributes that can be used for searching, filtering, and alerting.

---

### Importance of Parsed Logs in Security Operations

1. **Improved Readability & Efficiency**
   Parsed logs present data in a structured way, making it much easier for analysts to quickly identify relevant details instead of manually scanning raw text.

2. **Enables Advanced Queries & Analytics**
   With extracted fields, analysts can run precise queries (e.g., grouping by status codes or filtering by specific URLs) that would be impractical or error-prone on unparsed logs.

3. **Supports Visualization & Dashboards**
   Parsed fields can be aggregated and visualized in dashboards (e.g., charts of request trends, error rates, or traffic patterns), which provide situational awareness for SOC teams.

4. **Enhances Incident Detection & Response**
   Structured data enables correlation rules, anomaly detection, and automated alerting. For example, unusual spikes in `status_code=500` responses or requests from suspicious `referrer` domains can be detected quickly.

5. **Scalability & Automation**
   In modern SIEMs, automation and AI-driven detections rely on structured fields. Parsing ensures logs can integrate seamlessly into workflows, enrichment pipelines, and threat intelligence correlations.

---

✅ In summary, while unparsed logs provide raw completeness, **parsed logs are essential for professional SOC workflows**. They transform noisy raw data into actionable intelligence, empowering analysts to respond faster, uncover hidden patterns, and maintain high standards of operational excellence.


