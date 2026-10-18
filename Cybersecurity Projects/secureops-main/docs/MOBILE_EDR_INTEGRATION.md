# Mobile EDR -> SecureOps SOC Workbench Integration

Give this document to the AI agent building the mobile EDR. It describes exactly how the mobile EDR should send detections into SecureOps.

## Goal

The mobile EDR app should push endpoint/security detections to SecureOps as alerts. SecureOps will normalize the payload, extract IOCs, calculate a priority score, and show the result in the SOC alert queue with source `EDR`.

## SecureOps Base URLs

Local development:

```text
SecureOps API base: http://127.0.0.1:8000/api/v1
Frontend:          http://127.0.0.1:5173
API docs:          http://127.0.0.1:8000/api/docs
```

Physical Android/iOS devices must use the SOC machine LAN IP instead of `127.0.0.1`, for example:

```text
SecureOps API base: http://192.168.1.9:8000/api/v1
```

Production should use HTTPS:

```text
https://YOUR-SOC-BACKEND/api/v1
```

## Authentication

EDR ingestion uses a shared ingest key, not a user JWT.

SecureOps setting:

```text
EDR_INGEST_API_KEY=<strong-random-key>
```

Send this header with every EDR ingest request:

```text
X-SecureOps-Ingest-Key: <strong-random-key>
```

In local development, SecureOps allows localhost ingestion if no ingest key is configured. Do not rely on that in production.

## Discovery Endpoint

The EDR can call this endpoint to discover ingest URLs:

```http
GET /api/v1/ingest/edr/config
```

Example response:

```json
{
  "endpoint": "http://127.0.0.1:8000/api/v1/ingest/edr/alerts",
  "batch_endpoint": "http://127.0.0.1:8000/api/v1/ingest/edr/alerts/batch",
  "header": "X-SecureOps-Ingest-Key",
  "key_required": true,
  "source": "EDR"
}
```

## Single Alert Endpoint

```http
POST /api/v1/ingest/edr/alerts
Content-Type: application/json
X-SecureOps-Ingest-Key: <key>
```

### Required Fields

- `title`: short alert title, 3-255 chars
- `severity`: one of `critical`, `high`, `medium`, `low`, `informational`

### Recommended Fields

- `alert_id`: stable unique ID from the EDR
- `description`: analyst-readable description
- `category`: example `Malware`, `Suspicious Login`, `Device Tampering`, `Data Exfiltration`
- `device_id`: mobile device ID
- `hostname`: device name
- `platform`: `android`, `ios`, `windows`, `linux`, `macos`
- `os_version`: OS version
- `app_version`: EDR app version
- `username`: local user, MDM owner, or account
- `src_ip`, `dst_ip`
- `file_hash`
- `process_name`
- `package_name`: Android package or iOS bundle ID
- `command_line`
- `iocs`: list of `{ "type": "...", "value": "..." }`
- `raw_event`: full original EDR event JSON

For IHADRS-style events, include these `raw_event` fields when available:

- `event_type`: for example `ihadrs_threat`
- `ihadrs_id`: stable finding ID
- `category`: for example `MALICIOUS_APP`, `RISKY_APP`, `NETWORK`, `DEVICE`, `POLICY`
- `risk_score`: integer score from the mobile engine
- `triggered_rules`: rule IDs
- `mitre_techniques`: MITRE ATT&CK Mobile technique IDs
- `remediation`: analyst/user remediation steps

### IOC Types

Use these values where possible:

```text
ip
domain
url
hash_md5
hash_sha1
hash_sha256
email
cve
hostname
package
process
device
```

## Single Alert Example

```json
{
  "alert_id": "mobile-edr-000001",
  "title": "Malicious APK detected",
  "description": "Mobile EDR detected a sideloaded APK matching a known malware hash.",
  "severity": "critical",
  "category": "Malware",
  "device_id": "android-device-7f3a92",
  "hostname": "ALI-PIXEL-8",
  "platform": "android",
  "os_version": "Android 15",
  "app_version": "1.4.2",
  "username": "ali@example.com",
  "package_name": "com.fake.secureupdate",
  "process_name": "com.fake.secureupdate",
  "file_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "src_ip": "10.10.1.23",
  "dst_ip": "203.0.113.45",
  "iocs": [
    { "type": "domain", "value": "malicious-update.example" },
    { "type": "url", "value": "https://malicious-update.example/payload.apk" }
  ],
  "raw_event": {
    "event_type": "apk_malware_detected",
    "sensor_id": "sensor-abc",
    "confidence": 0.97,
    "action_taken": "blocked",
    "timestamp": "2026-05-29T09:00:00Z"
  }
}
```

Example curl:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/ingest/edr/alerts" \
  -H "Content-Type: application/json" \
  -H "X-SecureOps-Ingest-Key: dev-edr-key" \
  -d '{"alert_id":"mobile-edr-000001","title":"Malicious APK detected","severity":"critical","category":"Malware","device_id":"android-device-7f3a92","hostname":"ALI-PIXEL-8","platform":"android","file_hash":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","raw_event":{"event_type":"apk_malware_detected"}}'
```

## Batch Alert Endpoint

```http
POST /api/v1/ingest/edr/alerts/batch
Content-Type: application/json
X-SecureOps-Ingest-Key: <key>
```

Batch payload:

```json
{
  "alerts": [
    {
      "alert_id": "mobile-edr-000001",
      "title": "Malicious APK detected",
      "severity": "critical",
      "category": "Malware",
      "device_id": "android-device-7f3a92",
      "platform": "android",
      "raw_event": { "event_type": "apk_malware_detected" }
    }
  ]
}
```

Batch size limit:

```text
1-500 alerts per request
```

## SecureOps Response

```json
{
  "created": 1,
  "updated": 0,
  "alert_ids": ["secureops-alert-uuid"]
}
```

The EDR should store the returned SecureOps alert ID if it needs later cross-linking. If the same `alert_id` is sent again, SecureOps updates the existing alert and returns `"created": 0, "updated": 1` with the same SecureOps alert ID.

## Retry Rules

The mobile EDR agent should implement a local outbound queue:

- Queue detections locally if SecureOps is offline.
- Retry with exponential backoff: 10s, 30s, 2m, 5m, 15m.
- Preserve event order per device where possible.
- Do not drop critical/high alerts unless the user explicitly clears the queue.
- Deduplicate by `alert_id`; the same EDR event should keep the same `alert_id`.

## Error Handling

Expected statuses:

- `201`: accepted and alert created
- `400` or `422`: invalid payload; log locally and do not retry unchanged
- `401`: bad ingest key; stop retrying and surface configuration error
- `503`: ingest key not configured or backend not ready; retry later
- `500`: server error; retry later

## Mobile EDR Implementation Checklist

The EDR app should include:

- SecureOps URL setting
- EDR ingest key setting
- Connectivity test button calling `/api/v1/ingest/edr/config`
- Local encrypted queue for unsent events
- Background sync worker
- Batch upload when many events are queued
- Stable `alert_id` generation
- Raw event preservation in `raw_event`
- Severity mapping to SecureOps values
- Platform fields for mobile context: `device_id`, `platform`, `os_version`, `app_version`, `package_name`

## Severity Mapping Guidance

Use:

- `critical`: confirmed malware, active compromise, exfiltration, device root/jailbreak with malicious behavior
- `high`: blocked malware, suspicious persistence, credential theft indicators, known bad C2
- `medium`: suspicious app behavior, risky permission abuse, unknown domain beaconing
- `low`: policy violation, weak signal, informational device finding
- `informational`: telemetry-only event

## What SecureOps Does With the Event

SecureOps will:

- Create an alert with source `EDR`
- Store `alert_id` as `source_ref`
- Update the existing alert when a retry sends the same `alert_id`
- Extract IOCs from fields and raw event text
- Store the full event in `raw_log`
- Score priority using severity, source reliability, IOCs, category, and context
- Broadcast new and updated alerts over WebSocket to connected dashboards
