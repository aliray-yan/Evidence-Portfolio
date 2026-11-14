"""Reproduce four attributed local stock controls; not model training or incident data."""
import argparse
import json
import urllib.request
from .config import ROOT
from .setup_models import download
from sentinel_ml.video import sha256


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download',action='store_true',help='Download missing attributed clips after confirming their license page')
    args=parser.parse_args()
    folder=ROOT/'.local/visual-exchange-evaluation';folder.mkdir(parents=True,exist_ok=True)
    for name in ('cash','handshake','normal','document'):
        source=ROOT/'evaluation/visual-controls'/f'{name}.source.json'
        record=json.loads(source.read_text(encoding='utf-8'));target=folder/f'{name}.mp4'
        if target.exists():
            if sha256(target)!=record['sha256']:raise ValueError('Existing control differs from the attributed checksum: '+name)
        else:
            if not args.download:raise ValueError('Missing '+name+'. Run with --download to fetch the documented control.')
            request=urllib.request.Request(record['page'],headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(request,timeout=30) as response:
                page=response.read(5*1024*1024).decode('utf-8')
            if record['license'] not in page:raise ValueError('The recorded free license could not be confirmed; inspect the publisher page.')
            download(record['media'],target,40*1024*1024,record['sha256'])
        (folder/source.name).write_text(json.dumps(record,indent=2),encoding='utf-8')
        print(name+': verified attributed local evaluation control',flush=True)


if __name__=='__main__':main()
