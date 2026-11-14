"""Local test-account bootstrap. JSON output is consumed only by the encrypted setup helper."""
import argparse
import json
import secrets
from pathlib import Path
from .config import ROOT,Config
from .mobile import configure
from .storage import Storage
from .db import Database,now,uid
from .security import hash_password
from .seed import seed


def create(directory):
    directory=Path(directory).resolve()
    if not directory.is_relative_to((ROOT/'.local').resolve()):
        raise ValueError('Test-account setup must stay in the ignored project-local test directory.')
    address=configure(directory);config=Config.from_env()
    storage=Storage(config);db=Database(config.data_dir/'sentinel.db',storage.audit_key)
    seed(db,storage,config)
    accounts=[]
    with db.transaction() as con:
        if con.execute('SELECT 1 FROM users').fetchone():
            raise ValueError('Accounts already exist. No account or password was changed.')
        for role,email,name in [('citizen','uploader@sentinel.test','Phone test uploader'),('admin','reviewer@sentinel.test','Desktop test reviewer')]:
            password=secrets.token_urlsafe(18);ident=uid('usr_')
            con.execute('INSERT INTO users(id,name,email,role,password_hash,created_at) VALUES (?,?,?,?,?,?)',(ident,name,email,role,hash_password(password),now()))
            db.audit(con,None,'operator.mobile_test_account',ident,{'role':role})
            accounts.append({'role':role,'email':email,'password':password})
    return {'url':f'https://{address}:8443','scope':'Temporary private-LAN test accounts only. Do not use this database for production.','accounts':accounts}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--directory',required=True)
    args=parser.parse_args()
    print(json.dumps(create(args.directory)))
