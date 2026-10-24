"""
Full Data Migration Script: Old Neon PostgreSQL -> New Neon PostgreSQL
Author: Antigravity Agent
Project: WisBees Operations Portal
"""

import sys
import json
import psycopg2
import psycopg2.extras

SRC_URL = "postgresql://neondb_owner:npg_zGjkfO4E2xTN@ep-hidden-wind-b4fncj1m-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"
DST_URL = "postgresql://neondb_owner:npg_BWxIEbzou1h6@ep-mute-cell-a1butwqf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

def main():
    print("====================================================================")
    print(" STARTING COMPLETE DATABASE TRANSFER: OLD NEON DB -> NEW NEON DB   ")
    print("====================================================================")

    # 1. Connect to both databases
    print("\n[1/6] Connecting to Source and Destination databases...")
    conn_src = psycopg2.connect(SRC_URL)
    cur_src = conn_src.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    conn_dst = psycopg2.connect(DST_URL)
    conn_dst.autocommit = False
    cur_dst = conn_dst.cursor()
    print("[+] Successfully connected to both Neon instances!")

    try:
        # 2. Extract all Foreign Key constraints on Destination so we can safely drop and restore them
        print("\n[2/6] Extracting Foreign Key constraints from Destination schema...")
        cur_dst.execute("""
            SELECT 
                conrelid::regclass::text AS table_name,
                conname AS constraint_name,
                pg_get_constraintdef(c.oid) AS constraint_def
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE contype = 'f' AND n.nspname = 'public';
        """)
        fk_constraints = cur_dst.fetchall()
        print(f"[+] Found {len(fk_constraints)} foreign key constraints to manage.")

        print("[*] Temporarily dropping Foreign Key constraints on Destination...")
        for table_name, con_name, _ in fk_constraints:
            cur_dst.execute(f'ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS "{con_name}";')
        conn_dst.commit()
        print("[+] Foreign Key constraints dropped temporarily.")

        # 3. Truncate all tables on Destination
        print("\n[3/6] Truncating all Destination tables...")
        cur_dst.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        all_tables = [r[0] for r in cur_dst.fetchall()]
        for t in all_tables:
            cur_dst.execute(f'TRUNCATE TABLE "{t}" CASCADE;')
        conn_dst.commit()
        print(f"[+] Cleaned all {len(all_tables)} tables in destination.")

        # 4. Transfer data table by table
        print("\n[4/6] Transferring data from Source -> Destination...")
        transferred_totals = {}

        for table in all_tables:
            # Query Source
            cur_src.execute(f'SELECT * FROM "{table}";')
            rows = cur_src.fetchall()
            row_count = len(rows)
            transferred_totals[table] = row_count

            if row_count == 0:
                print(f"  [-] {table}: 0 rows (skipped)")
                continue

            columns = list(rows[0].keys())
            quoted_cols = [f'"{c}"' for c in columns]
            cols_sql = ", ".join(quoted_cols)

            # Prepare values with JSON adaptation if needed
            values_list = []
            for r in rows:
                row_vals = []
                for c in columns:
                    v = r[c]
                    if isinstance(v, (dict, list)):
                        row_vals.append(psycopg2.extras.Json(v))
                    else:
                        row_vals.append(v)
                values_list.append(tuple(row_vals))

            insert_query = f'INSERT INTO "{table}" ({cols_sql}) VALUES %s'
            psycopg2.extras.execute_values(cur_dst, insert_query, values_list, page_size=1000)
            conn_dst.commit()
            print(f"  [+] {table}: Successfully transferred {row_count} rows.")

        # 5. Re-add Foreign Key constraints
        print("\n[5/6] Restoring and validating all Foreign Key constraints...")
        for table_name, con_name, con_def in fk_constraints:
            cur_dst.execute(f'ALTER TABLE {table_name} ADD CONSTRAINT "{con_name}" {con_def};')
        conn_dst.commit()
        print(f"[+] All {len(fk_constraints)} foreign key constraints restored and verified!")

        # 6. Synchronize all Sequences
        print("\n[6/6] Synchronizing sequences...")
        cur_src.execute("""
            SELECT sequencename, last_value 
            FROM pg_sequences 
            WHERE schemaname = 'public';
        """)
        seq_records = cur_src.fetchall()
        for s in seq_records:
            seq_name = s['sequencename']
            last_val = s['last_value']
            if last_val is not None:
                cur_dst.execute(f"SELECT setval('\"{seq_name}\"', %s, true);", (last_val,))
                print(f"  [*] Sequence '{seq_name}' set to {last_val}")
            else:
                cur_dst.execute(f"SELECT setval('\"{seq_name}\"', 1, false);")
                print(f"  [*] Sequence '{seq_name}' initialized (1, false)")
        conn_dst.commit()
        print("[+] All sequences synchronized!")

        # Final Verification
        print("\n====================================================================")
        print(" VERIFICATION: ROW COUNT COMPARISON                                 ")
        print("====================================================================")
        all_match = True
        total_src = 0
        total_dst = 0

        for table in sorted(all_tables):
            cur_src.execute(f'SELECT count(*) FROM "{table}";')
            cnt_src = cur_src.fetchone()['count']
            cur_dst.execute(f'SELECT count(*) FROM "{table}";')
            cnt_dst = cur_dst.fetchone()[0]

            total_src += cnt_src
            total_dst += cnt_dst

            status = "MATCH" if cnt_src == cnt_dst else "MISMATCH"
            if cnt_src != cnt_dst:
                all_match = False
            
            if cnt_src > 0 or cnt_dst > 0:
                print(f"  {table:40} : Source={cnt_src:4} | Dest={cnt_dst:4} [{status}]")

        print("--------------------------------------------------------------------")
        print(f"TOTAL ROWS: Source={total_src} | Destination={total_dst}")
        if all_match:
            print("\n>>> DATA MIGRATION COMPLETED 100% SUCCESSFULLY WITH ZERO LOSS! <<<")
        else:
            print("\n[!] WARNING: Some table counts mismatched! Please review above.")

    except Exception as err:
        conn_dst.rollback()
        print(f"\n[-] ERROR DURING MIGRATION: {err}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        cur_src.close()
        conn_src.close()
        cur_dst.close()
        conn_dst.close()

if __name__ == '__main__':
    main()
