import importlib.util
import tempfile
import unittest
from pathlib import Path
import cv2
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('semantic_worker',ROOT/'backend/src/services/blueprint-processing/worker/semantic_plan.py')
worker=importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)

class DimensionAwareTests(unittest.TestCase):
    def test_imperial_and_shared_metric_units(self):
        self.assertAlmostEqual(worker.parse_length('40′-1½″'),12.2301)
        self.assertAlmostEqual(worker.parse_length("14'-9\""),4.4958)
        self.assertIsNone(worker.parse_length("8'-104\""))
        self.assertIsNone(worker.parse_length('13'))
        metric=worker.parse_room_dimensions('3.5 × 4.2 m')
        self.assertEqual((metric['width'],metric['length']),(3.5,4.2))

    def test_blank_drawing_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            image=Path(directory)/'plan.png'
            cv2.imwrite(str(image),np.full((300,300),255,dtype=np.uint8))
            with self.assertRaisesRegex(ValueError,'wall pairs'):
                worker.analyze(str(image),10,10)

    def test_architectural_fixture_preserves_readable_measurements(self):
        # This exercises OCR and image-derived geometry, not the curated retrace.
        plan=worker.analyze(str(ROOT/'frontend/public/reference/map1.png'),12.2301,21.336)
        expected={'Master bedroom':(21,15),'Kitchen':(13,14.75),'Drawing room':(13,19),'Car porch':(18.5,18.25)}
        rooms={room['name']:room for room in plan['rooms']}
        for name,(width,length) in expected.items():
            room=rooms[name]
            self.assertAlmostEqual(room['declaredSize']['width'],width*.3048)
            self.assertAlmostEqual(room['declaredSize']['length'],length*.3048)
            xs=[p['x'] for p in room['boundary']];ys=[p['y'] for p in room['boundary']]
            self.assertAlmostEqual(max(xs)-min(xs),width*.3048,places=3)
            self.assertAlmostEqual(max(ys)-min(ys),length*.3048,places=3)
        self.assertEqual(plan['metadata']['accuracyStatus'],'draft')
        self.assertGreater(plan['metadata']['imageRegistration']['left'],20)
        self.assertTrue(any(room['dimensionStatus']=='review' for room in plan['rooms']))
        self.assertEqual(plan['windows'],[])  # Proposed later, never claimed as read.
        for wall in plan['walls']:
            for p in (wall['start'],wall['end']):
                self.assertGreaterEqual(p['x'],-.01)
                self.assertGreaterEqual(p['y'],-.01)
                self.assertLessEqual(p['x'],12.24)
                self.assertLessEqual(p['y'],21.35)

if __name__=='__main__':unittest.main()
