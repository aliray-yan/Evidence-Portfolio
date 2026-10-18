import importlib.util
import unittest
from pathlib import Path
import numpy as np

WORKER = Path(__file__).parents[1] / "src/services/blueprint-processing/worker/analyze.py"
spec = importlib.util.spec_from_file_location("blueprint_worker", WORKER)
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)

class WorkerRegressionTests(unittest.TestCase):
    def test_geometry_is_translated_with_the_plot(self):
        segments=[{"x1":100,"y1":80,"x2":500,"y2":80,"length":400},{"x1":500,"y1":80,"x2":500,"y2":380,"length":300}]
        rooms=[{"boundary":[{"x":110,"y":90},{"x":490,"y":90},{"x":490,"y":370},{"x":110,"y":370}]}]
        plan=worker.assemble_floor_plan(segments,rooms,[],40,.5,(600,700))
        self.assertEqual(plan["plot"],{"width":10,"length":7.5})
        self.assertEqual(plan["walls"][0]["start"],{"x":0,"y":0})
        for element in plan["walls"]:
            for p in [element["start"],element["end"]]:
                self.assertTrue(0<=p["x"]<=plan["plot"]["width"])
                self.assertTrue(0<=p["y"]<=plan["plot"]["length"])
    def test_room_dimensions_cannot_calibrate_the_house(self):
        segments=[{"x1":0,"y1":0,"x2":400,"y2":0,"length":400},{"x1":400,"y1":0,"x2":400,"y2":300,"length":300}]
        self.assertEqual(worker.find_scale([{"text":"3 m","x":200,"y":150}],segments),(None,0.0))
        ppm,confidence=worker.find_scale([{"text":"10 m","x":200,"y":-30}],segments)
        self.assertEqual(ppm,40)
        self.assertGreater(confidence,0)
    def test_blank_image_has_no_walls_or_rooms(self):
        image=np.full((500,500),255,dtype=np.uint8)
        self.assertEqual(worker.detect_wall_segments(image),[])
        self.assertEqual(worker.detect_rooms(image),[])
    def test_normalization_preserves_aspect_ratio(self):
        image=np.full((300,600),255,dtype=np.uint8)
        normalized=worker.normalize_size(image)
        self.assertEqual(normalized.shape,(700,1400))

if __name__=="__main__":
    unittest.main()
