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

# Build the app Docker image
dockerbuild:
    docker build -t ghcr.io/dinno7/distributed-ecommerce .

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

# Reset migrations
dbreset:
 pnpm prisma migrate reset
 just dbseed

# Generate documents & api docs
@docsgen:
  #! /bin/sh
  source_dir="{{source_dir()}}"
  api_docs_dir="$source_dir/docs/api"
  docs_dir="$source_dir/docs"

  generated_dir="$source_dir/public"
  bruno_tmp="$generated_dir/apidocs/index.html.tmp"
  bruno="$generated_dir/apidocs/index.html"
  documents_out="$generated_dir/docs"

  if ! command -v mdbook >/dev/null 2>&1; then
    echo "mdbook doesn't exists"
    just mdbookInstall
  fi

  if ! command -v mdbook-mermaid >/dev/null 2>&1; then
    echo "mdbook-mermaid doesn't exists"
    just mdbookMermaidInstall
  fi

  mdbook build -d "$documents_out" "$docs_dir"

  if ! command -v bru >/dev/null 2>&1; then
    echo "Bruno cli doesn't exists"
    just installBruno
  fi

  cd "$api_docs_dir" && \
    bru docs generate --envs 'dev,staging' --git-link -o "$bruno_tmp" && \
    cat $bruno_tmp | sed 's/https:\/\/cdn.usebruno.com\/api-docs/\/apidocs/g' > "$bruno" && \
    rm "$bruno_tmp"

alias gendocs := docsgen
[private]
[confirm("Do you want install bruno cli?(y/n)")]
installBruno:
 npm install -g @usebruno/cli

[private]
[confirm("Do you want install mdbook?(y/n)")]
mdbookInstall:
 cargo install mdbook --locked

[private]
[confirm("Do you want install mdbook-mermaid?(y/n)")]
mdbookMermaidInstall:
 cargo install mdbook-mermaid --locked
