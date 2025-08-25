# FIPS SSH Solution for SiteGround Deployment

## Problem
The FIPS-compliant kernel (5.15.0-143-fips) prevents direct SSH connections to SiteGround with the error:
```
ssh_dispatch_run_fatal: Connection to X.X.X.X port 18765: invalid argument
```

## Solution
Use Docker containers with Ubuntu 22.04 (non-FIPS) for all SSH operations.

## Implementation in MCP
The SiteGround manager already implements this solution:

1. **For cache clearing** (`clearCache` method):
   - Spins up Ubuntu 22.04 container
   - Mounts SSH key as read-only
   - Installs openssh-client
   - Executes SSH commands inside container

2. **For Git operations**:
   - Git fetch/pull/push operations need to be wrapped in Docker
   - Use the same Ubuntu 22.04 container approach

## Manual Docker SSH Command Template
```bash
docker run --rm \
  -v /home/thornlcsw/.ssh/siteground_simple:/ssh/id_rsa:ro \
  -v /home/thornlcsw/docker/wp-projects/PROJECT:/project \
  ubuntu:22.04 \
  bash -c "apt-get update -qq && apt-get install -qq -y openssh-client git && \
           mkdir -p /root/.ssh && cp /ssh/id_rsa /root/.ssh/ && chmod 600 /root/.ssh/id_rsa && \
           cd /project && \
           git remote add siteground ssh://USER@HOST:18765/~/PATH && \
           git fetch siteground"
```

## For tylerhorn.com:
- Host: gvam1275.siteground.biz
- User: u1836-0gj8kch3wtnk
- Port: 18765
- Path: ~/www/tylerhorn.com/public_html/.git

## Remember
- ALWAYS use Docker for SSH to SiteGround
- The host system cannot make direct SSH connections due to FIPS
- This is a permanent solution, not a workaround