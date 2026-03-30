#!/bin/bash
# Vienna OS Health Monitor
# Run this script to check system health

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  Vienna OS Health Monitor"
echo "  $(date)"
echo "═══════════════════════════════════════════════════════════"
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check backend service
echo "1. Backend Service Status:"
if systemctl --user is-active --quiet vienna-console-server.service; then
    echo -e "   ${GREEN}✓${NC} Running"
    UPTIME=$(systemctl --user show vienna-console-server.service -p ActiveEnterTimestamp --value)
    echo "   Started: $UPTIME"
else
    echo -e "   ${RED}✗${NC} Not running"
    echo "   Run: systemctl --user start vienna-console-server.service"
fi
echo

# Check API health
echo "2. API Health:"
if curl -sf http://localhost:3100/api/v1/health > /dev/null 2>&1; then
    TIMESTAMP=$(curl -s http://localhost:3100/api/v1/health | jq -r '.timestamp' 2>/dev/null)
    echo -e "   ${GREEN}✓${NC} Responding"
    echo "   Last response: $TIMESTAMP"
else
    echo -e "   ${RED}✗${NC} Not responding"
fi
echo

# Check Vienna Core
echo "3. Vienna Core Status:"
if tail -100 /home/maxlawai/vienna-server.log 2>/dev/null | grep -q "ViennaCore.*initialized"; then
    echo -e "   ${GREEN}✓${NC} Initialized"
else
    echo -e "   ${YELLOW}⚠${NC} Not found in recent logs"
fi
echo

# Check database
echo "4. Database Connection:"
if PGPASSWORD=vienna2024 psql -U vienna -d vienna_prod -h localhost -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} Connected"
    USER_COUNT=$(PGPASSWORD=vienna2024 psql -U vienna -d vienna_prod -h localhost -t -c "SELECT COUNT(*) FROM users" 2>/dev/null | xargs)
    echo "   Users: $USER_COUNT"
else
    echo -e "   ${RED}✗${NC} Connection failed"
fi
echo

# Check log file size
echo "5. Log File:"
if [ -f /home/maxlawai/vienna-server.log ]; then
    SIZE=$(ls -lh /home/maxlawai/vienna-server.log | awk '{print $5}')
    echo "   Size: $SIZE"
    if [ "$(stat -c%s /home/maxlawai/vienna-server.log)" -gt 104857600 ]; then
        echo -e "   ${YELLOW}⚠${NC} Log file >100MB, consider rotating"
    else
        echo -e "   ${GREEN}✓${NC} Size OK"
    fi
else
    echo -e "   ${YELLOW}⚠${NC} Log file not found"
fi
echo

# Check for recent errors
echo "6. Recent Errors (last 10 minutes):"
ERROR_COUNT=$(tail -500 /home/maxlawai/vienna-server.log 2>/dev/null | grep -i "error\|failed\|exception" | grep -v "Ollama\|Local check" | wc -l)
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "   ${GREEN}✓${NC} No errors found"
else
    echo -e "   ${YELLOW}⚠${NC} $ERROR_COUNT error(s) found"
    echo "   Recent:"
    tail -500 /home/maxlawai/vienna-server.log 2>/dev/null | grep -i "error\|failed" | grep -v "Ollama\|Local check" | tail -3 | sed 's/^/   /'
fi
echo

# Resource usage
echo "7. Resource Usage:"
if ps aux | grep -q "[t]sx.*server.ts"; then
    PID=$(ps aux | grep "[t]sx.*server.ts" | awk '{print $2}' | head -1)
    CPU=$(ps aux | grep "[t]sx.*server.ts" | head -1 | awk '{print $3}')
    MEM=$(ps aux | grep "[t]sx.*server.ts" | head -1 | awk '{print $4}')
    echo "   PID: $PID"
    echo "   CPU: ${CPU}%"
    echo "   Memory: ${MEM}%"
    if [ "${CPU%.*}" -gt 50 ]; then
        echo -e "   ${YELLOW}⚠${NC} High CPU usage"
    elif [ "${MEM%.*}" -gt 10 ]; then
        echo -e "   ${YELLOW}⚠${NC} High memory usage"
    else
        echo -e "   ${GREEN}✓${NC} Usage normal"
    fi
else
    echo -e "   ${RED}✗${NC} Process not found"
fi
echo

echo "═══════════════════════════════════════════════════════════"
echo "  Health Check Complete"
echo "═══════════════════════════════════════════════════════════"
