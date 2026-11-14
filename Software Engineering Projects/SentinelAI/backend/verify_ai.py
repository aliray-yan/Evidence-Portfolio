"""Explicit, isolated smoke verification of installed pretrained models.

Fixtures are public MediaPipe test images only.
These checks establish plumbing only, never Pakistani-domain accuracy.
"""
import argparse
import json
from pathlib import Path
import tempfile
from .config import Config, ROOT
from .setup_models import download
from .pipeline import run_ffmpeg
from .perception import LocalPerception
from .redaction import face_review_copy

FIXTURES = {
    "thumb_up.jpg": ("1782185354353621", "5d673c081ab13b8a1812269ff57047066f9c33c07db5f4178089e8cb3fdc0291"),
    "portrait.jpg": ("1782185108020964", "a6f11efaa834706db23f275b6115058fa87fc7f14362681e6abe14e82749de3e"),
    "pose.jpg": ("1782185208547605", "c8a830ed683c0276d713dd5aeda28f415f10cd6291972084a40d0d8b934ed62b"),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download-fixtures', action='store_true')
    args = parser.parse_args()
    config = Config.from_env()
    directory = ROOT/'.local/ai-verification'
    directory.mkdir(parents=True,exist_ok=True)
    if args.download_fixtures:
        for name,(generation,digest) in FIXTURES.items():
            download(f'https://storage.googleapis.com/mediapipe-assets/tasks/testdata/vision/{name}?generation={generation}',directory/name,5_000_000,digest)
    report={'purpose':'Smoke checks on public test images; not domain validation.', 'fixtures':FIXTURES}
    with tempfile.TemporaryDirectory(dir=directory) as tmp:
        for name in FIXTURES:
            if not (directory/name).exists():
                raise ValueError('Download the official test fixtures explicitly with --download-fixtures first.')
            video=Path(tmp)/(Path(name).stem+'.mp4')
            run_ffmpeg(['-loop','1','-i',str(directory/name),'-t','2','-vf','scale=640:-2','-r','15','-pix_fmt','yuv420p','-c:v','libx264',str(video)])
            if name=='portrait.jpg':
                report['privacy']=face_review_copy(video,directory/'portrait-masked.mp4',config.face_model,tmp)
                assert report['privacy']['face_boxes']>0,'The face fixture produced no face boxes.'
            else:
                analyzer=LocalPerception(config.gesture_model,config.pose_model)
                events=analyzer.analyze(video)
                report[name]={'report':analyzer.last_report,'events':events}
                if name=='thumb_up.jpg':
                    assert any(e['title']=='Thumb up' for e in events),'The gesture fixture did not produce Thumb up.'
                else:
                    assert analyzer.last_report['frames_with_poses']>0,'The pose fixture produced no landmarks.'
    (directory/'verification.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({k:('passed' if k not in ('purpose','fixtures') else v) for k,v in report.items()}),flush=True)


if __name__=='__main__':
    main()
