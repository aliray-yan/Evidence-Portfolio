"""Metrics do not fabricate labels, missing predictions or evidence completeness."""
import math
import statistics
from backend.intelligence import normalize


def distance(reference, hypothesis):
    previous=list(range(len(hypothesis)+1))
    for i,a in enumerate(reference,1):
        current=[i]
        for j,b in enumerate(hypothesis,1):
            current.append(min(current[-1]+1,previous[j]+1,previous[j-1]+(a!=b)))
        previous=current
    return previous[-1]


def text_error(reference,hypothesis):
    reference=' '.join(normalize(reference).split())
    hypothesis=' '.join(normalize(hypothesis).split())
    a,b=reference.split(),hypothesis.split()
    return {'word_errors':distance(a,b),'reference_words':len(a),
            'character_errors':distance(reference,hypothesis),'reference_characters':len(reference)}


def classification(truth,predicted):
    if len(truth)!=len(predicted) or not truth:
        raise ValueError('Classification requires aligned nonempty labels.')
    labels=sorted(set(truth+predicted))
    matrix=[[sum(a==x and b==y for a,b in zip(truth,predicted)) for y in labels] for x in labels]
    per_class={}
    for i,label in enumerate(labels):
        tp=matrix[i][i];fn=sum(matrix[i])-tp;fp=sum(row[i] for row in matrix)-tp
        tn=len(truth)-tp-fn-fp
        per_class[label]={'support':tp+fn,'precision':tp/(tp+fp) if tp+fp else None,
                          'recall':tp/(tp+fn) if tp+fn else None,'f1':2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else None,
                          'false_positive_rate':fp/(fp+tn) if fp+tn else None,
                          'false_negative_rate':fn/(tp+fn) if tp+fn else None}
    return {'count':len(truth),'labels':labels,'confusion_matrix':matrix,'accuracy':sum(matrix[i][i] for i in range(len(labels)))/len(truth),
            'per_class':per_class,'macro_f1':statistics.mean(m['f1'] for m in per_class.values() if m['f1'] is not None)}


def event_matches(expected,predicted,minimum_iou=.5):
    # Maximum-cardinality bipartite matching avoids reference-order undercounts.
    edges=[]
    for actual in expected:
        candidates=[]
        for i,guess in enumerate(predicted):
            if actual['label']!=guess['label']:
                continue
            intersection=max(0,min(actual['end'],guess['end'])-max(actual['start'],guess['start']))
            union=max(actual['end'],guess['end'])-min(actual['start'],guess['start'])
            overlap=intersection/union if union else 0
            if overlap>=minimum_iou:
                candidates.append((overlap,i))
        edges.append([i for _,i in sorted(candidates,reverse=True)])
    matched={}
    for root in range(len(expected)):
        queue=[root];parents={root:None};found=None
        for current in queue:
            for guess in edges[current]:
                if guess not in matched:
                    found=(current,guess);break
                previous=matched[guess]
                if previous not in parents:
                    parents[previous]=(current,guess);queue.append(previous)
            if found:break
        if found:
            current,guess=found
            while True:
                matched[guess]=current
                if parents[current] is None:break
                current,guess=parents[current]
    return {'tp':len(matched),'fp':len(predicted)-len(matched),'fn':len(expected)-len(matched)}


def speaker_error(reference, predicted):
    """Overlap-aware DER, zero collar, optimal anonymous cluster permutation."""
    import numpy as np
    from scipy.optimize import linear_sum_assignment
    for turn in reference + predicted:
        if not isinstance(turn.get('speaker'),str) or not turn['speaker'] or not all(isinstance(turn.get(k),(int,float)) and not isinstance(turn[k],bool) and math.isfinite(turn[k]) for k in ('start','end')) or not 0<=turn['start']<turn['end']:
            raise ValueError('Invalid annotated or predicted speaker turn.')
    ref_names=sorted({t['speaker'] for t in reference});hyp_names=sorted({t['speaker'] for t in predicted})
    if max(len(ref_names),len(hyp_names))>50 or len(reference)+len(predicted)>4000:
        raise ValueError('Speaker evaluation exceeds the supported size.')
    boundaries=sorted({t[k] for t in reference+predicted for k in ('start','end')})
    intervals=[];weights=np.zeros((len(ref_names),len(hyp_names)))
    ref_index={v:i for i,v in enumerate(ref_names)};hyp_index={v:i for i,v in enumerate(hyp_names)}
    for start,end in zip(boundaries,boundaries[1:]):
        midpoint=(start+end)/2;duration=end-start
        ref={t['speaker'] for t in reference if t['start']<=midpoint<t['end']}
        hyp={t['speaker'] for t in predicted if t['start']<=midpoint<t['end']}
        intervals.append((duration,ref,hyp))
        for a in ref:
            for b in hyp:weights[ref_index[a],hyp_index[b]]+=duration
    left,right=linear_sum_assignment(weights,maximize=True)
    mapping={hyp_names[j]:ref_names[i] for i,j in zip(left,right)}
    totals={'reference_seconds':0.,'missed_seconds':0.,'false_alarm_seconds':0.,'confusion_seconds':0.}
    for duration,ref,hyp in intervals:
        correct=len(ref & {mapping[h] for h in hyp if h in mapping})
        totals['reference_seconds']+=duration*len(ref)
        totals['missed_seconds']+=duration*max(0,len(ref)-len(hyp))
        totals['false_alarm_seconds']+=duration*max(0,len(hyp)-len(ref))
        totals['confusion_seconds']+=duration*(min(len(ref),len(hyp))-correct)
    return totals


def reviewer_agreement(first,second):
    if len(first)!=len(second) or not first:
        raise ValueError('Agreement needs aligned nonempty independent annotations.')
    if any(not isinstance(v,str) or not v for v in first+second):
        raise ValueError('Reviewer labels must be nonempty strings.')
    labels=set(first+second);n=len(first)
    observed=sum(a==b for a,b in zip(first,second))/n
    expected=sum(first.count(label)*second.count(label) for label in labels)/(n*n)
    return {'pairs':n,'observed_agreement':observed,'cohen_kappa':(observed-expected)/(1-expected) if expected<1 else None}


def summarize(rows,predictions):
    mapping={p['clip_id']:p for p in predictions}
    if len(mapping)!=len(predictions) or set(mapping)!={r['clip_id'] for r in rows}:
        raise ValueError('Every test clip needs exactly one prediction, with no extra clips.')
    text_totals={'word_errors':0,'reference_words':0,'character_errors':0,'reference_characters':0}
    annotated_texts=0;truth=[];predicted=[];times=[];gestures={'tp':0,'fp':0,'fn':0};gesture_clips=0
    speakers={'reference_seconds':0.,'missed_seconds':0.,'false_alarm_seconds':0.,'confusion_seconds':0.};speaker_clips=0;reviewer_a=[];reviewer_b=[]
    for row in rows:
        p=mapping[row['clip_id']]
        if p['sha256']!=row['sha256']:
            raise ValueError('Prediction input checksum does not match the annotated clip.')
        if p.get('status') not in ('partial','completed'):
            raise ValueError('A failed or unprocessed clip cannot count as an evaluated prediction.')
        if row.get('reference_transcript') is not None:
            if p.get('transcript') is None:
                raise ValueError('Speech was not run for a clip with a reference transcript.')
            result=text_error(row['reference_transcript'],p['transcript'])
            for k,v in result.items():text_totals[k]+=v
            annotated_texts+=1
        if row.get('review_priority') is not None:
            truth.append(row['review_priority']);predicted.append(p['review_priority'])
            if row.get('second_reviewer_priority') is not None:
                reviewer_a.append(row['review_priority']);reviewer_b.append(row['second_reviewer_priority'])
        if row.get('speaker_turns') is not None:
            if p.get('speaker_turns') is None:
                raise ValueError('Speaker analysis was not run for an annotated clip.')
            for k,v in speaker_error(row['speaker_turns'],p['speaker_turns']).items():speakers[k]+=v
            speaker_clips+=1
        if row.get('gestures') is not None:
            if p.get('gestures') is None:
                raise ValueError('Hand/pose analysis was not run for an annotated clip.')
            for event in row['gestures']+p['gestures']:
                if not all(math.isfinite(event[k]) for k in ('start','end')) or not 0<=event['start']<event['end']:
                    raise ValueError('Invalid annotated or predicted event interval.')
            result=event_matches(row['gestures'],p['gestures'])
            for k,v in result.items():gestures[k]+=v
            gesture_clips+=1
        elapsed=p.get('elapsed_seconds')
        if elapsed is not None:
            if not isinstance(elapsed,(int,float)) or not math.isfinite(elapsed) or elapsed<0:raise ValueError('Invalid measured latency.')
            times.append(elapsed)
    return {'clips':len(rows),'fyp_50_clip_collection_reached':len(rows)>=50,
            'scope':'Only the supplied authorized holdout annotations. Not proof of deployment readiness or legal validity.',
            'speech':{**text_totals,'clips':annotated_texts,'wer':text_totals['word_errors']/text_totals['reference_words'] if text_totals['reference_words'] else None,
                      'cer':text_totals['character_errors']/text_totals['reference_characters'] if text_totals['reference_characters'] else None},
            'review_priority':classification(truth,predicted) if truth else None,
            'reviewer_agreement':reviewer_agreement(reviewer_a,reviewer_b) if reviewer_a else None,
            'speaker_diarization':{**speakers,'clips':speaker_clips,'collar_seconds':0,'includes_overlap':True,
                                   'der':sum(speakers[k] for k in ('missed_seconds','false_alarm_seconds','confusion_seconds'))/speakers['reference_seconds'] if speakers['reference_seconds'] else None},
            'gesture_events':{**gestures,'clips':gesture_clips,'iou_threshold':.5,'precision':gestures['tp']/(gestures['tp']+gestures['fp']) if gestures['tp']+gestures['fp'] else None,
                              'recall':gestures['tp']/(gestures['tp']+gestures['fn']) if gestures['tp']+gestures['fn'] else None},
            'latency':{'count':len(times),'mean_seconds':statistics.mean(times) if times else None,'max_seconds':max(times) if times else None}}
