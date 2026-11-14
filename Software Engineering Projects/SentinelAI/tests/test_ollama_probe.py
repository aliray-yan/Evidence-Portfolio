import json
import pytest
from evaluation import ollama_probe
from evaluation.ollama_probe import PROBES, chat_payload, request_json, validate_draft


SOURCE = [{'id': 's1', 'text': 'Please use the official counter.'}]


def draft(**changes):
    return json.dumps({'claims': [{'source_id': 's1', 'quote': 'official counter',
                                  'comment': 'The authored line describes a payment procedure.'}],
                       'uncertainty': ['Actual events are not established.'], 'missing': [], **changes})


def test_exact_quotation_and_known_source_required():
    assert validate_draft(draft(), SOURCE)['claims'][0]['source_id'] == 's1'
    with pytest.raises(ValueError, match='unknown source'):
        validate_draft(draft(claims=[{'source_id': 'e999', 'quote': 'official counter', 'comment': 'Example'}]), SOURCE)
    with pytest.raises(ValueError, match='exact excerpt'):
        validate_draft(draft(claims=[{'source_id': 's1', 'quote': 'Give me cash', 'comment': 'Example'}]), SOURCE)


def test_invented_fields_empty_uncertainty_and_unavailable_sources_rejected():
    with pytest.raises(ValueError):
        validate_draft(draft(action='dispatch'), SOURCE)
    with pytest.raises(ValueError):
        validate_draft(draft(uncertainty=[]), SOURCE)
    with pytest.raises(ValueError):
        validate_draft(draft(uncertainty=['']), SOURCE)
    with pytest.raises(ValueError):
        validate_draft(draft(), [])
    assert validate_draft(draft(claims=[]), [])['claims'] == []


def test_experiment_is_synthetic_bounded_and_has_no_tools():
    for probe in PROBES:
        payload = chat_payload(probe)
        assert 'tools' not in payload
        assert payload['think'] is False
        assert payload['options']['num_ctx'] == 2048
        assert payload['options']['num_predict'] == 384
        assert json.loads(payload['messages'][1]['content'])['synthetic'] is True
        assert probe['manual_rubric']
    with pytest.raises(ValueError, match='Unsupported'):
        request_json('https://example.com/api/chat')


def test_valid_citation_does_not_establish_semantic_truth():
    # Deliberately demonstrates the validator's limit, not a factuality claim.
    content = draft(claims=[{'source_id': 's1', 'quote': 'official counter',
                             'comment': 'Unsupported interpretation requiring manual review.'}])
    assert validate_draft(content, SOURCE)['claims']


@pytest.mark.parametrize('failure', ['timeout', 'truncated', 'tool_request'])
def test_probe_records_failed_requests_and_requests_unload(tmp_path, monkeypatch, failure):
    calls = []

    def fake(path, payload=None, timeout=180):
        calls.append((path, payload))
        if path == '/api/tags':
            return {'models': [{'name': ollama_probe.MODEL, 'digest': 'synthetic-test-digest'}]}
        if path != '/api/chat' or payload.get('keep_alive') == 0:
            return {}
        if failure == 'timeout':
            raise TimeoutError('Test timeout')
        return {'done': True, 'done_reason': 'length' if failure == 'truncated' else 'stop',
                'message': {'content': draft(claims=[]),
                            **({'tool_calls': [{'function': {'name': 'dispatch'}}]} if failure == 'tool_request' else {})}}

    monkeypatch.setattr(ollama_probe, 'request_json', fake)
    output = tmp_path / 'report.json'
    result = ollama_probe.run(output, only='missing_evidence')
    assert result['unload_requested']
    assert result['results'][0]['structural_checks_passed'] is False
    assert result['results'][0]['error']
    assert result['results'][0]['manual_semantic_review'] == 'pending'
    assert calls[-1][1]['keep_alive'] == 0
    assert json.loads(output.read_text())['results'] == result['results']
    with pytest.raises(ValueError, match='preserve'):
        ollama_probe.run(output)
