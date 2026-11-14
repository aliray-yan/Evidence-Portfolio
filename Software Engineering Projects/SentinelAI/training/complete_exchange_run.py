"""Finish a long local experiment without treating failed screening as success.

Waits for one identified training process, then evaluates frozen weights and
writes the screening report. Never modifies application model selection.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import time

import psutil


def wait_for_manifest(bundle, running, timeout, *, clock=time.monotonic, sleep=time.sleep):
    deadline = clock() + timeout
    while not (bundle / 'manifest.json').is_file():
        if not running():
            raise RuntimeError('Training stopped without a completed bundle; inspect its log. Cached features remain reusable.')
        if clock() >= deadline:
            raise TimeoutError('Training monitor deadline reached; no completion or quality claim was made.')
        sleep(10)


def complete(args):
    base = Path(__file__).resolve().parents[1]
    paths = [args.bundle, args.controls, args.external, args.report, args.state]
    if any(not path.resolve().is_relative_to(base) for path in paths):
        raise ValueError('Experiment monitor paths must remain inside this project')
    if args.external.exists() or args.report.exists():
        raise ValueError('Preserve existing results; choose new report paths')
    args.state.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation prevents accidentally starting two finishers for a job.
    with args.state.open('x', encoding='utf-8') as handle:
        json.dump({'stage': 'starting', 'activated': False}, handle)
    record = {'schema': 1, 'bundle': str(args.bundle), 'training_pid': args.training_pid,
              'training_created': args.training_created,
              'monitor_pid': psutil.Process().pid, 'monitor_created': psutil.Process().create_time(),
              'started_at': datetime.now(timezone.utc).isoformat(), 'activated': False}

    def status(stage, **fields):
        record.update(stage=stage, updated_at=datetime.now(timezone.utc).isoformat(), **fields)
        temporary = args.state.with_suffix('.part')
        temporary.write_text(json.dumps(record, indent=2), encoding='utf-8')
        temporary.replace(args.state)
        print(json.dumps(record), flush=True)

    def running():
        try:
            process = psutil.Process(args.training_pid)
            command = process.cmdline()
            if abs(process.create_time() - args.training_created) > .01:
                return False
            if 'training.train_exchange' not in command or '--output' not in command:
                return False
            output = Path(command[command.index('--output') + 1])
            if not output.is_absolute():
                output = Path(process.cwd()) / output
            return output.resolve() == args.bundle.resolve() and process.is_running()
        except (psutil.Error, ValueError, IndexError):
            return False

    try:
        status('waiting_for_training')
        wait_for_manifest(args.bundle, running, args.timeout_seconds)
        status('evaluating_frozen_model')
        from .evaluate_learned_exchange import evaluate
        from .exchange_report import screening
        evaluate(args.bundle, args.controls, args.external)
        result = screening(args.bundle, args.external)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        with args.report.open('x', encoding='utf-8') as handle:
            json.dump(result, handle, indent=2)
        status('screening_passed_requires_integration_review' if result['screening_pass'] else 'screening_failed_do_not_activate',
               checks=result['checks'], report=str(args.report), external=str(args.external))
    except Exception as exc:
        status('failed', error=f'{type(exc).__name__}: {exc}')
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--training-pid', type=int, required=True)
    parser.add_argument('--training-created', type=float, required=True)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--controls', type=Path, default=Path('.local/visual-exchange-evaluation'))
    parser.add_argument('--external', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--state', type=Path, required=True)
    parser.add_argument('--timeout-seconds', type=int, default=21600)
    args = parser.parse_args()
    if not 1 <= args.timeout_seconds <= 43200:
        parser.error('Monitor deadline must be between one second and twelve hours')
    complete(args)
