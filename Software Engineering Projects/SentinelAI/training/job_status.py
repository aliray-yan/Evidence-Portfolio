"""Read-only local training progress. Does not start, stop or activate models."""
import argparse
from collections import deque
import json
from pathlib import Path
import time

import psutil

ROOT = Path(__file__).resolve().parents[1]
POINTER = ROOT / '.local/exchange-research/current-training.json'
FINISHED = {'screening_passed_requires_integration_review', 'screening_failed_do_not_activate', 'failed', 'interrupted'}


def alive(pid, created):
    if not isinstance(pid, int) or not isinstance(created, (float, int)):
        return False
    try:
        process = psutil.Process(pid)
        return process.is_running() and abs(process.create_time() - created) < .01
    except psutil.Error:
        return False


def phase(state, training_alive, monitor_alive):
    stage = state.get('stage', 'unknown')
    if stage in FINISHED:
        return stage
    if stage in {'starting', 'waiting_for_training'}:
        if not training_alive:
            return 'training_stopped_check_saved_results'
        if not monitor_alive:
            return 'training_running_evaluation_monitor_stopped'
    if stage == 'evaluating_frozen_model' and not monitor_alive:
        return 'evaluation_interrupted'
    return stage


def snapshot(pointer=POINTER):
    config = json.loads(Path(pointer).read_text(encoding='utf-8-sig'))
    def path(name):
        result = (ROOT / config[name]).resolve()
        if not result.is_relative_to(ROOT):
            raise ValueError('Progress path escapes the project')
        return result
    state = json.loads(path('state').read_text(encoding='utf-8-sig'))
    training_alive = alive(state.get('training_pid'), state.get('training_created'))
    monitor_alive = alive(state.get('monitor_pid'), state.get('monitor_created'))
    log = path('log')
    recent = []
    if log.exists():
        with log.open(encoding='utf-8-sig', errors='replace') as handle:
            for line in deque(handle, maxlen=60):
                try:
                    recent.append(json.loads(line))
                except ValueError:
                    pass
    progress = next((r for r in reversed(recent) if 'features_complete' in r), {})
    epoch = next((r.get('epoch') for r in reversed(recent) if 'epoch' in r), None)
    ready = len(list(path('cache').glob('*.npz')))
    total = config['total']
    prepared = progress.get('features_prepared_this_run', 0)
    eta = None
    if training_alive and 0 < ready < total and prepared >= 10:
        eta = round((total - ready) * progress['seconds'] / prepared)
    return {'stage': phase(state, training_alive, monitor_alive),
            'training_alive': training_alive, 'monitor_alive': monitor_alive,
            'prepared_windows': ready, 'total_windows': total,
            'preparation_percent': round(100 * ready / total, 1),
            'estimated_preparation_seconds_remaining': eta,
            'epoch': epoch, 'activated': state.get('activated', False),
            'error': state.get('error'), 'checks': state.get('checks'), 'log': str(log)}


def display(result):
    names = {'waiting_for_training': 'Training run is active',
             'evaluating_frozen_model': 'Training finished; video evaluation is running',
             'screening_passed_requires_integration_review': 'Evaluation finished: checks passed; integration review still required',
             'screening_failed_do_not_activate': 'Evaluation finished: one or more detection/performance checks FAILED; model stays disabled',
             'failed': 'The job failed; see the error below',
             'interrupted': 'The job was interrupted',
             'training_stopped_check_saved_results': 'Training is NOT running; saved work needs checking',
             'training_running_evaluation_monitor_stopped': 'Training is running, but automatic evaluation needs restarting',
             'evaluation_interrupted': 'Evaluation was interrupted; it has not been declared complete'}
    print('SentinelAI - local training progress')
    print(names.get(result['stage'], result['stage']))
    print(f"Prepared video windows: {result['prepared_windows']:,} / {result['total_windows']:,} ({result['preparation_percent']}%)")
    if result['epoch'] is not None:
        print(f"Latest training epoch: {result['epoch']} (early stopping decides when to finish)")
    if result['estimated_preparation_seconds_remaining'] is not None:
        minutes = max(1, round(result['estimated_preparation_seconds_remaining'] / 60))
        print(f'Estimated preparation remaining: {minutes // 60} h {minutes % 60} min; fitting and evaluation follow.')
        print('This estimate can change with video decoding and other laptop activity.')
    if result['error']:
        print(result['error'])
    if result['checks']:
        failed = [name for name, passed in result['checks'].items() if not passed]
        print('Failed checks: ' + (', '.join(failed) if failed else 'none'))
    print('This viewer does not enable any model in the application.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--watch', action='store_true')
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    try:
        while True:
            result = snapshot()
            if args.watch and not args.json:
                print('\033[2J\033[H', end='')
            print(json.dumps(result, indent=2)) if args.json else display(result)
            if not args.watch:
                break
            print('\nRefreshes every 15 seconds. Ctrl+C closes this viewer only.')
            time.sleep(15)
    except KeyboardInterrupt:
        pass
