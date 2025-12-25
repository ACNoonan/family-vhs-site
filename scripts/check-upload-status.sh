#!/bin/bash

# Check Upload Status Script
# Quick status check for the VHS upload

AWS_PROFILE="AWS_CLI"
S3_BUCKET="s3://noonan-family-vhs-archive/videos/"
USB_PATH="/Volumes/2703299"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}              VHS Upload Status Check                          ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# USB Status
if [ -d "$USB_PATH" ]; then
    USB_COUNT=$(find "$USB_PATH" -maxdepth 1 \( -name "*.mp4" -o -name "*.MP4" \) 2>/dev/null | wc -l | tr -d ' ')
    USB_SIZE=$(du -sh "$USB_PATH" 2>/dev/null | awk '{print $1}')
    echo -e "${GREEN}USB Drive:${NC} Connected"
    echo -e "  Files: $USB_COUNT MP4 files"
    echo -e "  Size:  $USB_SIZE"
else
    echo -e "${RED}USB Drive:${NC} Not connected"
fi

echo ""

# S3 Status
echo -e "${YELLOW}Checking S3...${NC}"
S3_OUTPUT=$(aws s3 ls "$S3_BUCKET" --profile "$AWS_PROFILE" --recursive --human-readable --summarize 2>/dev/null)

if [ -z "$S3_OUTPUT" ]; then
    echo -e "${RED}Error connecting to S3 or bucket is empty${NC}"
else
    S3_COUNT=$(echo "$S3_OUTPUT" | grep -c "\.mp4" || echo "0")
    S3_SIZE=$(echo "$S3_OUTPUT" | grep "Total Size" | awk '{print $3, $4}')
    
    echo -e "${GREEN}S3 Bucket:${NC} noonan-family-vhs-archive"
    echo -e "  Files: $S3_COUNT video files uploaded"
    echo -e "  Size:  $S3_SIZE"
    
    echo ""
    echo -e "${BLUE}Uploaded Files:${NC}"
    echo "$S3_OUTPUT" | grep "\.mp4" | awk '{print "  ✓ " $NF " (" $3 " " $4 ")"}'
fi

echo ""

# Check if upload process is running
UPLOAD_RUNNING=$(ps aux | grep "aws s3 sync" | grep -v grep | wc -l | tr -d ' ')
if [ "$UPLOAD_RUNNING" -gt 0 ]; then
    echo -e "${GREEN}Upload Status:${NC} IN PROGRESS 🔄"
    echo -e "  An upload process is currently running"
else
    if [ "$USB_COUNT" = "$S3_COUNT" ] 2>/dev/null; then
        echo -e "${GREEN}Upload Status:${NC} COMPLETE ✅"
    else
        echo -e "${YELLOW}Upload Status:${NC} PAUSED/NOT RUNNING"
        echo -e "  Run ./scripts/upload-videos.sh to start/resume"
    fi
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

