"""Local operator commands. Passwords and keys are never stored in source code."""
import argparse
import getpass
import re
from .config import Config
from .storage import Storage
from .db import Database, now, uid
from .security import hash_password
from .seed import seed


def main():
    parser=argparse.ArgumentParser(description='SentinelAI local administration')
    sub=parser.add_subparsers(dest='command',required=True)
    account=sub.add_parser('create-admin')
    account.add_argument('--email',required=True)
    account.add_argument('--name',required=True)
    sub.add_parser('seed-demo')
    sub.add_parser('verify-audit')
    args=parser.parse_args()
    config=Config.from_env()
    storage=Storage(config)
    db=Database(config.data_dir/'sentinel.db',storage.audit_key)
    if args.command=='create-admin':
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',args.email) or not 2<=len(args.name)<=100:
            parser.error('Provide a valid email and a name of 2–100 characters.')
        password=getpass.getpass('New administrator password (12+ characters): ')
        confirm=getpass.getpass('Confirm password: ')
        if password!=confirm or not 12<=len(password)<=128:
            parser.error('Passwords must match and contain 12–128 characters.')
        with db.transaction() as con:
            if con.execute('SELECT 1 FROM users WHERE email=?',(args.email.casefold(),)).fetchone():
                parser.error('This email is already registered. No account was changed.')
            ident=uid('usr_')
            con.execute("INSERT INTO users(id,name,email,role,password_hash,created_at) VALUES (?,?,?,'admin',?,?)",(ident,args.name,args.email.casefold(),hash_password(password),now()))
            db.audit(con,None,'operator.admin_created',ident)
        print('Administrator created. Sign in using Account sign-in.')
    elif args.command=='seed-demo':
        if not config.demo:
            parser.error('SENTINEL_DEMO must be 1 to create synthetic scenarios.')
        seed(db,storage,config)
        print('Synthetic scenarios initialized. Existing demo data was preserved.')
    else:
        with db.connect() as con:
            result=db.verify_audit(con)
        print(result)
        if not result['valid']:
            raise SystemExit(1)


if __name__=='__main__':
    main()
