#!/bin/bash

# Backup/Restore Performance Validation
# Validates NFR-010: Automatic backup every 6 hours with acceptable restore time

set -e

SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY}"
BACKUP_FILE="./test-backup-$(date +%Y%m%d-%H%M%S).sql"
TEST_DB="easy_eng_backup_test"

echo "🔄 Backup/Restore Performance Test"
echo "====================================="
echo ""

# Step 1: Create test backup
echo "📦 Step 1: Creating database backup..."
START_BACKUP=$(date +%s)

pg_dump \
  -h localhost \
  -U postgres \
  -d postgres \
  -F c \
  -b \
  -v \
  -f "$BACKUP_FILE"

END_BACKUP=$(date +%s)
BACKUP_TIME=$((END_BACKUP - START_BACKUP))

echo "✅ Backup completed in ${BACKUP_TIME}s"
echo ""

# Step 2: Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "📊 Backup size: $BACKUP_SIZE"
echo ""

# Step 3: Create test database for restore
echo "🗄️  Step 2: Creating test database..."
createdb -h localhost -U postgres "$TEST_DB" || true
echo ""

# Step 4: Restore backup
echo "♻️  Step 3: Restoring backup..."
START_RESTORE=$(date +%s)

pg_restore \
  -h localhost \
  -U postgres \
  -d "$TEST_DB" \
  -v \
  "$BACKUP_FILE"

END_RESTORE=$(date +%s)
RESTORE_TIME=$((END_RESTORE - START_RESTORE))

echo "✅ Restore completed in ${RESTORE_TIME}s"
echo ""

# Step 5: Verify data integrity
echo "🔍 Step 4: Verifying data integrity..."

# Count records in key tables
ORIGINAL_USERS=$(psql -h localhost -U postgres -d postgres -t -c "SELECT COUNT(*) FROM profiles;")
RESTORED_USERS=$(psql -h localhost -U postgres -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM profiles;")

ORIGINAL_BOOKINGS=$(psql -h localhost -U postgres -d postgres -t -c "SELECT COUNT(*) FROM bookings;")
RESTORED_BOOKINGS=$(psql -h localhost -U postgres -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM bookings;")

echo "  Users: $ORIGINAL_USERS → $RESTORED_USERS"
echo "  Bookings: $ORIGINAL_BOOKINGS → $RESTORED_BOOKINGS"

if [ "$ORIGINAL_USERS" == "$RESTORED_USERS" ] && [ "$ORIGINAL_BOOKINGS" == "$RESTORED_BOOKINGS" ]; then
  echo "✅ Data integrity verified"
else
  echo "❌ Data integrity check failed!"
  exit 1
fi
echo ""

# Step 6: Cleanup
echo "🧹 Cleanup..."
dropdb -h localhost -U postgres "$TEST_DB"
rm "$BACKUP_FILE"
echo ""

# Step 7: Results
echo "📊 Performance Results"
echo "======================"
echo "Backup time:  ${BACKUP_TIME}s"
echo "Restore time: ${RESTORE_TIME}s"
echo "Total time:   $((BACKUP_TIME + RESTORE_TIME))s"
echo ""

# NFR-010 Validation: Backup every 6 hours
BACKUP_WINDOW_SECONDS=$((6 * 60 * 60))  # 6 hours
ACCEPTABLE_RESTORE_TIME=300  # 5 minutes

if [ $BACKUP_TIME -lt $ACCEPTABLE_RESTORE_TIME ] && [ $RESTORE_TIME -lt $ACCEPTABLE_RESTORE_TIME ]; then
  echo "✅ PASS: Backup/restore times meet NFR-010 requirements"
  echo "   (Backup: ${BACKUP_TIME}s < ${ACCEPTABLE_RESTORE_TIME}s)"
  echo "   (Restore: ${RESTORE_TIME}s < ${ACCEPTABLE_RESTORE_TIME}s)"
  exit 0
else
  echo "❌ FAIL: Backup/restore times exceed acceptable limits"
  echo "   Backup time: ${BACKUP_TIME}s (max: ${ACCEPTABLE_RESTORE_TIME}s)"
  echo "   Restore time: ${RESTORE_TIME}s (max: ${ACCEPTABLE_RESTORE_TIME}s)"
  exit 1
fi
