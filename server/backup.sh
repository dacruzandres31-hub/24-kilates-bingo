#!/bin/bash
BACKUP_DIR="/var/www/backups"
APP_DIR="/var/www/bingo24k"
DATE=$(date +%Y%m%d_%H%M%S)

case "$1" in
  save)
    MSG="${2:-snapshot}"
    BACKUP_NAME="backup_${DATE}_${MSG}"
    echo "📦 Creando backup: $BACKUP_NAME"
    tar --exclude='node_modules' --exclude='.git' -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C /var/www bingo24k
    echo "✅ Backup guardado: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    ls -lh "$BACKUP_DIR/$BACKUP_NAME.tar.gz"
    ;;
  list)
    echo "📋 Backups disponibles:"
    ls -lht $BACKUP_DIR/*.tar.gz 2>/dev/null || echo "No hay backups"
    ;;
  restore)
    BACKUP_FILE="$BACKUP_DIR/$2"
    [ ! -f "$BACKUP_FILE" ] && BACKUP_FILE="$BACKUP_DIR/$2.tar.gz"
    if [ ! -f "$BACKUP_FILE" ]; then
      echo "❌ Backup no encontrado. Disponibles:"
      ls -1 $BACKUP_DIR/*.tar.gz | xargs -n1 basename
      exit 1
    fi
    echo "⚠️  Restaurando: $BACKUP_FILE"
    pm2 stop bingo24k-api
    rm -rf $APP_DIR.old && mv $APP_DIR $APP_DIR.old
    tar -xzf "$BACKUP_FILE" -C /var/www
    cd $APP_DIR && npm install --production
    pm2 restart bingo24k-api
    echo "✅ Restauracion completada"
    ;;
  *)
    echo "Uso: backup.sh {save|list|restore} [msg|file]"
    echo "  save [msg]     - Crear snapshot"
    echo "  list           - Listar backups"  
    echo "  restore [file] - Restaurar backup"
    ;;
esac
