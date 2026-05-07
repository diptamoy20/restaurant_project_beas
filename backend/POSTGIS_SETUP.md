# PostGIS Setup

The location migrations require PostGIS to be installed on the PostgreSQL server before running Prisma migrations.

If `prisma migrate dev` fails with:

```text
ERROR: extension "postgis" is not available
HINT: The extension must first be installed on the system where PostgreSQL is running.
```

install the PostGIS package for the same PostgreSQL installation that serves `DATABASE_URL`.

For Windows PostgreSQL installs:

1. Open **Stack Builder** from the PostgreSQL program group.
2. Select the PostgreSQL instance used by this project, for example the server listening on port `5433`.
3. Install **Spatial Extensions > PostGIS** for that PostgreSQL version.
4. Restart the PostgreSQL service.
5. Run:

```powershell
psql -h localhost -p 5433 -U postgres -d restaurant_db -c "CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA restaurant_management;"
```

Then rerun:

```powershell
npx prisma migrate dev
```

Prisma also validates migrations against a shadow database. The important part is that PostGIS must be installed at the PostgreSQL server level, not only enabled in one database.
