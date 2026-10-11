# Backup e Restauro

## PostgreSQL — Backup com pg_dump

### Backup manual

```bash
pg_dump -Fc -h <HOST> -p 5432 -U <USER> -d <DATABASE> -f backup_$(date +%Y%m%d_%H%M%S).dump
```

Flags:
- `-Fc` — formato custom (comprimido, compatível com pg_restore)
- `-h` — host do servidor
- `-U` — utilizador
- `-d` — nome da base de dados

Para usar a connection string directamente:

```bash
pg_dump -Fc "$DATABASE_URL" -f backup_$(date +%Y%m%d_%H%M%S).dump
```

### Cron job para backups diários

Adicionar ao crontab (`crontab -e`):

```cron
# Backup diário às 03:00, manter últimos 30 dias
0 3 * * * PGPASSWORD="<PASSWORD>" pg_dump -Fc -h <HOST> -p 5432 -U <USER> -d <DATABASE> -f /backups/admvc_$(date +\%Y\%m\%d).dump && find /backups -name "admvc_*.dump" -mtime +30 -delete
```

Alternativa com connection string num ficheiro `.env`:

```bash
#!/bin/bash
# /scripts/backup.sh
source /path/to/.env
BACKUP_DIR="/backups"
FILENAME="admvc_$(date +%Y%m%d_%H%M%S).dump"

pg_dump -Fc "$DATABASE_URL" -f "$BACKUP_DIR/$FILENAME"

# Apagar backups com mais de 30 dias
find "$BACKUP_DIR" -name "admvc_*.dump" -mtime +30 -delete

echo "Backup criado: $FILENAME"
```

```cron
0 3 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Restauro com pg_restore

```bash
# Restaurar para a mesma base de dados (limpa e recria)
pg_restore -h <HOST> -p 5432 -U <USER> -d <DATABASE> --clean --if-exists backup.dump

# Restaurar para uma base de dados nova
createdb -h <HOST> -U <USER> admvc_restored
pg_restore -h <HOST> -p 5432 -U <USER> -d admvc_restored backup.dump
```

Flags úteis:
- `--clean` — apaga objectos existentes antes de restaurar
- `--if-exists` — não dá erro se o objecto não existir
- `-j 4` — usa 4 jobs paralelos (mais rápido)

## Vercel Blob — Backup

### Listar todos os blobs

```bash
# Instalar CLI se necessário
npm i -g vercel

# Listar blobs do projecto
npx vercel blob list --token "$BLOB_READ_WRITE_TOKEN"
```

### Script para download de todos os blobs

```bash
#!/bin/bash
# /scripts/backup-blobs.sh
# Requer: BLOB_READ_WRITE_TOKEN no ambiente

BACKUP_DIR="/backups/blobs/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Usar a API do Vercel Blob para listar e descarregar
node -e "
const { list } = require('@vercel/blob');

async function backupBlobs() {
  let cursor;
  let total = 0;

  do {
    const result = await list({ cursor, token: process.env.BLOB_READ_WRITE_TOKEN });
    for (const blob of result.blobs) {
      console.log(blob.url);
      total++;
    }
    cursor = result.cursor;
  } while (cursor);

  console.error('Total blobs: ' + total);
}

backupBlobs();
" > "$BACKUP_DIR/blob_urls.txt"

# Descarregar cada blob
while IFS= read -r url; do
  filename=$(basename "$url")
  curl -sL "$url" -o "$BACKUP_DIR/$filename"
done < "$BACKUP_DIR/blob_urls.txt"

echo "Blobs guardados em: $BACKUP_DIR"
```

### Cron job para backup semanal de blobs

```cron
# Backup de blobs todos os domingos às 04:00
0 4 * * 0 BLOB_READ_WRITE_TOKEN="<TOKEN>" /scripts/backup-blobs.sh >> /var/log/blob-backup.log 2>&1
```
