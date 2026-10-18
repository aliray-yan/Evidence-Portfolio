"""Integration checks use an isolated temporary database, never the user's mission."""
import math
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import random
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import anomaly
import database
import main


class MissionWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.original_path = database.DB_PATH
        database.DB_PATH = Path(self.directory.name) / "test.db"
        self.client = TestClient(main.app)
        self.client.__enter__()
        rng = random.Random(42)
        self.random_patch = patch.object(main.random, "Random", return_value=rng)
        self.random_patch.start()

    def tearDown(self):
        self.random_patch.stop()
        self.client.__exit__(None, None, None)
        database.DB_PATH = self.original_path
        self.directory.cleanup()

    def advance(self, days=1):
        response = self.client.post("/api/mission/advance", json={"days": days})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def check_in(self, **changes):
        payload = {"day": 1, "mood": 4, "energy": 3, "stress": 2, "sleep_quality": 4, "notes": "Rest interrupted by maintenance."}
        payload.update(changes)
        return self.client.post("/api/check-ins", json=payload)

    def test_check_in_update_persists_and_validates(self):
        self.advance()
        self.assertEqual(self.check_in().status_code, 200)
        self.assertEqual(self.check_in(mood=5).status_code, 200)
        rows = self.client.get("/api/check-ins").json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["mood"], 5)
        with database.get_conn() as conn:
            self.assertEqual(database.get_check_ins(conn)[0]["notes"], "Rest interrupted by maintenance.")
        self.assertEqual(self.check_in(stress=6).status_code, 422)
        self.assertEqual(self.check_in(day=2).status_code, 409)
        self.assertEqual(self.check_in(notes="x" * 1001).status_code, 422)

    def test_radiation_event_detected_immediately_after_baseline(self):
        self.advance(7)
        response = self.client.post("/api/mission/inject-anomaly", json={"indicator": "radiation"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["latest_readings"]["radiation"]["flagged"])
        flags = self.client.get("/api/flags").json()
        event = next(flag for flag in flags if flag["indicator"] == "radiation")
        self.assertEqual(event["day"], 8)
        self.assertIsNotNone(event["expected_value"])
        radiation = next(ind for ind in self.client.get("/api/indicators").json() if ind["key"] == "radiation")
        self.assertGreater(radiation["history"][-1]["value"], radiation["history"][-1]["band_upper"])

    def test_review_report_and_reset(self):
        self.advance(7)
        self.client.post("/api/mission/inject-anomaly", json={"indicator": "sleep"})
        self.assertEqual(self.check_in(day=8).status_code, 200)
        payload = {"indicator": "sleep", "day": 8, "review_status": "follow_up", "review_note": "Recheck after next sleep block."}
        self.assertEqual(self.client.post("/api/flags/review", json=payload).status_code, 200)
        flags = self.client.get("/api/flags").json()
        flag = next(f for f in flags if f["indicator"] == "sleep" and f["day"] == 8)
        self.assertEqual(flag["review_status"], "follow_up")
        self.assertEqual(flag["review_note"], payload["review_note"])
        report = self.client.get("/api/mission/report").json()
        self.assertEqual(len(report["readings"]), 40)
        self.assertEqual(report["check_ins"][0]["day"], 8)
        self.assertEqual(report["data_mode"], "simulated_telemetry_with_user_entered_check_ins")
        self.assertEqual(len(report["provenance"]["citation"]["integrated_datasets"]), 2)
        self.assertTrue(any(a["review_note"] == payload["review_note"] for a in report["alerts"]))
        self.assertEqual(self.client.post("/api/mission/reset", json={"astronaut_name": "Demo crew"}).status_code, 200)
        self.assertEqual(self.client.get("/api/check-ins").json(), [])
        self.assertEqual(self.client.get("/api/flags").json(), [])
        self.assertEqual(self.client.get("/api/mission/status").json()["current_day"], 0)

    def test_review_rejects_missing_flag_and_bad_status(self):
        payload = {"indicator": "sleep", "day": 1, "review_status": "reviewed"}
        self.assertEqual(self.client.post("/api/flags/review", json=payload).status_code, 404)
        payload["review_status"] = "medically_cleared"
        self.assertEqual(self.client.post("/api/flags/review", json=payload).status_code, 422)

    def test_simultaneous_advances_keep_every_day(self):
        with ThreadPoolExecutor(max_workers=3) as executor:
            responses = list(executor.map(lambda _: self.client.post("/api/mission/advance", json={"days": 1}), range(3)))
        self.assertTrue(all(response.status_code == 200 for response in responses))
        self.assertEqual(self.client.get("/api/mission/status").json()["current_day"], 3)
        for indicator in self.client.get("/api/indicators").json():
            self.assertEqual([row["day"] for row in indicator["history"]], [1, 2, 3])

    def test_legacy_database_adds_tables_without_losing_readings(self):
        legacy = Path(self.directory.name) / "legacy.db"
        with sqlite3.connect(legacy) as conn:
            conn.executescript("CREATE TABLE mission (id INTEGER PRIMARY KEY, astronaut_name TEXT, current_day INTEGER, started_at TEXT); INSERT INTO mission VALUES (1, 'Existing crew', 1, '2026-10-01'); CREATE TABLE readings (id INTEGER PRIMARY KEY, indicator TEXT, mission_day INTEGER, value REAL, injected_anomaly TEXT, is_flagged INTEGER, anomaly_score REAL, created_at TEXT, UNIQUE(indicator, mission_day)); INSERT INTO readings VALUES (1, 'sleep', 1, 6.5, NULL, 0, NULL, '2026-10-01');")
        conn.close()
        with patch.object(database, "DB_PATH", legacy):
            database.init_db()
            with database.get_conn() as conn:
                self.assertEqual(database.get_mission(conn)["astronaut_name"], "Existing crew")
                self.assertEqual(database.get_history(conn, "sleep")[0]["value"], 6.5)
                self.assertEqual(database.get_check_ins(conn), [])

    def test_prediction_uncertainty_includes_observation_noise(self):
        baseline = {"residual_sd": 2.0, "n": 7, "center_day": 4.0, "sxx": 28.0}
        self.assertAlmostEqual(anomaly._prediction_sd(baseline, 4), 2.0 * math.sqrt(1 + 1 / 7))


if __name__ == "__main__":
    unittest.main()
