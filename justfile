set dotenv-load
set dotenv-filename := '.env'

DOCS_PRODUCT_PATH := "docs"
DOCS_PORT := env("DOCS_PORT", "7001")

[private]
default:
    @just --list

# Start server in dev mode
dev:
    pnpm start:dev


# Serve document and watch changes
@doc:
    echo "🌐 Served on http://localhost:{{ DOCS_PORT }}"
    echo "-------------"
    mdbook serve --port {{ DOCS_PORT }} {{ DOCS_PRODUCT_PATH }}

# Serve document and watch changes
docbuild:
    mdbook build {{ DOCS_PRODUCT_PATH }}

# Generate Prisma Client
dbgen:
  pnpm prisma generate

# Run development migrations and regenerate Prisma Client
dbmig name="":
  pnpm prisma migrate dev {{if name != "" {"--name {{name}}"} else {""}}}
  just dbgen

# Run seeds
dbseed:
 pnpm prisma db seed
