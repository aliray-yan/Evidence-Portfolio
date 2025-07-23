AI-Powered Threat Feed Summarization System
A fully automated cybersecurity project that monitors new CVEs, summarizes them using GPT, and prepares them for team notifications — simulating real-world SOC Analyst workflows.

🚀 Features
Live Threat Monitoring: Pulls fresh CVEs using RSS feeds (e.g., CISA, NVD).

AI-Powered Summarization: Uses OpenAI's GPT to turn technical CVE data into clear summaries.

Formatted Output: Presents vulnerabilities in Markdown with titles, summaries, and links.

Ready for Notification: Final output can be sent to Slack, Notion, Email, or even Skool with minor adjustments.

🛠️ Tools & Technologies
n8n (No-code automation platform)

OpenAI GPT-4

Public CVE RSS Feeds

Markdown formatting

Optional integration with Slack / Notion / Email

🧠 How It Works
RSS Node reads top CVEs from a public feed.

OpenAI Node summarizes each vulnerability with details:

Affected systems

Severity (if mentioned)

Recommended actions

Set Node formats the output for human readability.

Final Node is a placeholder for pushing to Slack, Notion, Email, or Skool community posts.

