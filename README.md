# voyageurs-be

Express 5 + TypeScript API. Started from `express-generator-typescript`, then shaped like voyageurs-be: Drizzle, Google OAuth, and Jose access/refresh tokens.

## Scripts

- `pnpm dev` — API on port **8001**, using `.env.development`
- `pnpm type-check`
- `pnpm lint`
- `pnpm db-generate` — write a migration from `src/db/schemas`
- `pnpm db-migrate-dev` — apply migrations to the dev database
- `pnpm db-studio-dev` — opens Drizzle Studio on port **8002**
  - db studio (db viewer): https://local.drizzle.studio/?port=8002

Local Postgres database: `voyageurs_db` on `localhost:5432` (`voyageurs` / `voyageurs`).

Running Postgres with Docker locally

- ```
  docker desktop start
  docker run --name voyageurs-db -e POSTGRES_USER=voyageursadmin -e POSTGRES_PASSWORD=voyageurspassword -e POSTGRES_DB=voyageurs_db -p 5432:5432 -d postgres
  docker ps -a
  docker start voyageurs-db
  docker exec -it voyageurs-db bash
  psql -U voyageursadmin -d voyageurs_db
  ```

    - URL to connect to: `postgres://voyageursadmin:voyageurspassword@localhost:5432/voyageurs_db`
    - `--name voyageurs-db`: Container name (kebab-case, env-scoped — mirrors AWS RDS identifier convention)
    - `-e POSTGRES_USER=voyageursadmin`: Db master username (no hyphens/underscores — mirrors AWS RDS master username
      rules)
    - `-e POSTGRES_PASSWORD=voyageurspassword`: Replace with a strong password (avoid `@`, `/`, `?` — safe for connection
      strings)
    - `-e POSTGRES_DB=voyageurs_db`: Database name (snake_case, env-scoped — PostgreSQL identifiers cannot contain hyphens)
    - `-p 5432:5432`: Exposes PostgreSQL on port 5432
    - `-d postgres`: Runs the official PostgreSQL image in the background

- Drop and recreate DB: log into separate database (`postgres`) to modify/delete main database (`voyageurs_db`)
    - `-U`: user
    - `-d`: database name

```
psql -U voyageursadmin -d postgres
```

- Inside psql:
    - `\l`: view all databases
    - `\du`: view all users
    - Note: don't drop `postgres`, `template0`, or `template1` databases
    - Sometimes might need to enter postgres db to delete other db: `\c postgres`

```postgresql
DROP DATABASE your_database_name;
CREATE DATABASE your_database_name;
```