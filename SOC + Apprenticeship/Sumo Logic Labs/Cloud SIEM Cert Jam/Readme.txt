Cloud SIEM Investigation – Phishing to AWS Credential Exfiltration 🚨

Summary:
Simulated a real SOC investigation in Cloud SIEM, tracking an attack from phishing email delivery to AWS IAM credential exfiltration. Correlated multiple security signals into a complete kill chain analysis and applied MITRE ATT&CK mapping for deeper insight.

Investigation Steps:

Correlated Signals:

Phishing email detected via Proofpoint TAP.

Malicious link click observed in proxy logs.

First AWS API call (ListBucket) from compromised account.

Spike in AWS API calls and Lambda enumeration.

GuardDuty alert: UnauthorizedAccess: IAMUser/InstanceCredentialExfiltration.

Timeline Reconstruction:

03:24 – Email delivered

04:24 – User clicked link

04:55 – AWS API call initiated

05:11 – API call spike

05:16 – Lambda enumeration

05:28 – Credential exfiltration confirmed

Key Findings:

Attack began with phishing and credential harvesting.

Compromised credentials used for AWS reconnaissance and execution.

Mapped to MITRE ATT&CK stages: Initial Access → Discovery → Execution → Exfiltration.

Recommendations:

Revoke compromised IAM credentials immediately.

Analyze for potential lateral movement.

Review proxy logs for additional compromised accounts.

Cross-check with threat intelligence feeds for related IOCs.

Skills & Tools:

Cloud SIEM, Proofpoint TAP, AWS CloudTrail, GuardDuty, MITRE ATT&CK mapping, Log correlation & analysis, Incident response strategy.