"""Verify a trusted exported bundle without importing it into the case database."""
import argparse
import json
from sentinel_ml.bundle import load_network


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory")
    parser.add_argument("--video", help="Optional authorized video, up to 120 seconds; no database writes")
    args = parser.parse_args()
    try:
        if args.video:
            from .vision import LocalViolence
            detector = LocalViolence(args.directory)
            events = detector.analyze(args.video)
            print(json.dumps({"events": events, "analysis": detector.last_report}, indent=2))
        else:
            _, manifest = load_network(args.directory)
            print(f"Verified architecture, tensor weights and checksum: {manifest['version']}. No video inference or local accuracy validation performed.")
    except Exception as exc:
        parser.exit(1, f"Model verification failed ({type(exc).__name__}). Check the bundle, environment and README; no model was enabled.\n")


if __name__ == "__main__":
    main()
