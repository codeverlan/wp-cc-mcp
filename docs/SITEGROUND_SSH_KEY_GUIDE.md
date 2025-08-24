# SiteGround SSH Key Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [SSH Key Format Requirements](#ssh-key-format-requirements)
3. [Key Generation](#key-generation)
4. [Converting Between Key Formats](#converting-between-key-formats)
5. [Importing Keys to SiteGround](#importing-keys-to-siteground)
6. [Common Issues and Solutions](#common-issues-and-solutions)
7. [Integration with wp-cc-mcp](#integration-with-wp-cc-mcp)

## Overview

SiteGround uses SSH key-based authentication for secure access to their hosting servers. This guide covers everything you need to know about SSH key formats, generation, conversion, and importing them to SiteGround.

## SSH Key Format Requirements

### Supported Key Types
SiteGround supports the following SSH key types:
- **RSA Keys** (2048-bit or 4096-bit recommended)
- **ED25519 Keys** (modern, secure, and efficient)
- **DSA Keys** (legacy, not recommended for new keys)

### Format Requirements
1. **OpenSSH Format** (Preferred)
   - Public keys should be in single-line OpenSSH format
   - Private keys should start with `-----BEGIN OPENSSH PRIVATE KEY-----`
   - No blank lines at the beginning or end of the file
   - UTF-8 encoding required

2. **SSH2/RFC4716 Format** (May need conversion)
   - Starts with `---- BEGIN SSH2 PUBLIC KEY ----`
   - Multi-line format with headers
   - Often used by PuTTY and other Windows SSH clients

## Key Generation

### Linux/Mac (OpenSSH)

#### Generate RSA Key (4096-bit)
```bash
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
```

#### Generate ED25519 Key (Recommended)
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

#### Key Files Created
- Private key: `~/.ssh/id_rsa` or `~/.ssh/id_ed25519`
- Public key: `~/.ssh/id_rsa.pub` or `~/.ssh/id_ed25519.pub`

### Windows (PuTTY)

1. Open PuTTYgen
2. Select key type (RSA or ED25519)
3. Click "Generate" and move mouse for randomness
4. Save public and private keys
5. Note: PuTTY uses .ppk format for private keys

## Converting Between Key Formats

### SSH2/RFC4716 to OpenSSH Format

If you receive a key in SSH2 format (common from Windows/PuTTY users), convert it:

```bash
# Convert SSH2 public key to OpenSSH format
ssh-keygen -i -f ssh2_key.pub > openssh_key.pub

# Or directly append to authorized_keys
ssh-keygen -i -f ssh2_key.pub >> ~/.ssh/authorized_keys
```

#### Example SSH2 Format
```
---- BEGIN SSH2 PUBLIC KEY ----
Comment: "2048-bit RSA, user@example"
AAAAB3NzaC1yc2EAAAADAQABAAABAQDwxgE7D3HYLYddNHLMFK8OfpRwwUSgxiB8fbecvk
qLa1VZaNOwdsJ6LfKNMx5z8N4Q+PPH0J1OMpGO6rXlIA7A9onHPPHxHpHO4xRnXPHyoh3x
[... more base64 data ...]
---- END SSH2 PUBLIC KEY ----
```

#### Converted OpenSSH Format
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDwxgE7D3HYLYddNHLMFK8OfpRwwUSgxiB8fbecvk... user@example
```

### OpenSSH to SSH2/RFC4716 Format

If you need to provide your key in SSH2 format:

```bash
# Convert OpenSSH public key to SSH2 format
ssh-keygen -e -f ~/.ssh/id_rsa.pub -m RFC4716 > id_rsa_ssh2.pub
```

### PuTTY PPK to OpenSSH Format

For PuTTY private keys (.ppk files):

```bash
# Install putty-tools if not available
sudo apt-get install putty-tools

# Convert PPK to OpenSSH private key
puttygen private_key.ppk -O private-openssh -o id_rsa

# Convert PPK to OpenSSH public key
puttygen private_key.ppk -O public-openssh -o id_rsa.pub
```

## Importing Keys to SiteGround

### Via Site Tools (Web Interface)

1. **Navigate to SSH Keys Manager**
   - Log into SiteGround Site Tools
   - Go to **Devs** → **SSH Keys Manager**

2. **Import Existing Key**
   - Click **Import**
   - Enter a key name (for identification)
   - Paste your **public key** in OpenSSH format
   - Click **Import**

3. **Authorize the Key**
   - After importing, find your key in the list
   - Click **Actions** → **Authorize**
   - Select the account to authorize for

### Important Notes for Import

1. **Use Public Key Only**: Never upload or share your private key
2. **Format Check**: Ensure the key is in OpenSSH format (single line)
3. **No Extra Whitespace**: Remove any trailing spaces or newlines
4. **UTF-8 Encoding**: Save the file with UTF-8 encoding if copying from a file

## Common Issues and Solutions

### Issue 1: "Invalid Key Format" Error

**Symptoms**: SiteGround rejects the key during import

**Solutions**:
```bash
# Check if key is in SSH2 format
head -1 your_key.pub

# If it shows "---- BEGIN SSH2 PUBLIC KEY ----", convert it:
ssh-keygen -i -f your_key.pub > converted_key.pub

# Verify the converted key is single-line OpenSSH format
cat converted_key.pub
```

### Issue 2: SSH Connection Refused

**Symptoms**: Cannot connect even with authorized key

**Solutions**:
1. Verify SSH is enabled in Site Tools
2. Check you're using the correct port (18765 for SiteGround)
3. Ensure key permissions are correct:
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

### Issue 3: "Permission denied (publickey)"

**Symptoms**: SSH rejects authentication

**Solutions**:
```bash
# Test connection with verbose output
ssh -vvv -p 18765 user@server.siteground.biz

# Specify the private key explicitly
ssh -p 18765 -i ~/.ssh/id_rsa user@server.siteground.biz

# Add key to SSH agent
ssh-add ~/.ssh/id_rsa
```

### Issue 4: PuTTY Key Not Working

**Symptoms**: PuTTY-generated key doesn't work on SiteGround

**Solution**:
1. Export the public key from PuTTYgen in OpenSSH format
2. Or convert existing .ppk file:
```bash
puttygen key.ppk -O public-openssh -o key_openssh.pub
```

## Integration with wp-cc-mcp

### Setting Up SSH Authentication

Before using the SiteGround integration features in wp-cc-mcp:

1. **Generate SSH Key** (if you don't have one):
```bash
ssh-keygen -t ed25519 -C "wp-cc-mcp@siteground"
```

2. **Add to SSH Agent**:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

3. **Import to SiteGround**:
   - Copy public key: `cat ~/.ssh/id_ed25519.pub`
   - Import via Site Tools → SSH Keys Manager
   - Authorize for your account

4. **Test Connection**:
```bash
ssh -p 18765 u1836-xxxxx@server.siteground.biz
```

### Using with wp-cc-mcp

Once SSH keys are configured, you can use the SiteGround tools:

```javascript
// Connect project to SiteGround
wp_siteground_connect(
  "my-project",
  "server.siteground.biz",
  "u1836-xxxxx",
  "home/customer/www/domain.com/public_html",
  "https://domain.com"
)

// Deploy to SiteGround (requires working SSH keys)
wp_siteground_deploy("my-project")
```

### SSH Configuration for wp-cc-mcp

Create or update `~/.ssh/config` for easier connections:

```
Host siteground-mysite
    HostName server.siteground.biz
    User u1836-xxxxx
    Port 18765
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

Then the connection URL becomes simpler:
```
ssh://siteground-mysite/~/git/repo-path
```

## Security Best Practices

1. **Never Share Private Keys**: Only share public keys (`.pub` files)
2. **Use Strong Passphrases**: Protect private keys with passphrases
3. **Regular Key Rotation**: Replace keys periodically
4. **Separate Keys per Service**: Use different keys for different services
5. **Backup Keys Securely**: Store backups in encrypted locations
6. **Monitor Key Usage**: Check SiteGround logs for unauthorized access

## Quick Reference Commands

```bash
# Generate new ED25519 key
ssh-keygen -t ed25519 -C "siteground-key"

# Convert SSH2 to OpenSSH
ssh-keygen -i -f ssh2_key.pub > openssh_key.pub

# Convert OpenSSH to SSH2
ssh-keygen -e -f openssh_key.pub -m RFC4716 > ssh2_key.pub

# Test SiteGround connection
ssh -p 18765 -v user@server.siteground.biz

# Add key to SSH agent
ssh-add ~/.ssh/id_ed25519

# Check loaded keys
ssh-add -l

# Copy public key to clipboard (Linux)
xclip -sel clip < ~/.ssh/id_ed25519.pub

# Copy public key to clipboard (Mac)
pbcopy < ~/.ssh/id_ed25519.pub
```

## Troubleshooting Checklist

- [ ] SSH key is in OpenSSH format (single line for public key)
- [ ] Key is imported to SiteGround Site Tools
- [ ] Key is authorized for the correct account
- [ ] Using correct port (18765)
- [ ] Private key permissions are 600
- [ ] SSH directory permissions are 700
- [ ] No extra whitespace in key file
- [ ] SSH agent is running and key is loaded
- [ ] Correct username and hostname

## Additional Resources

- [SiteGround SSH Documentation](https://www.siteground.com/tutorials/ssh/)
- [OpenSSH Manual](https://www.openssh.com/manual.html)
- [RFC 4716 - SSH Public Key File Format](https://tools.ietf.org/html/rfc4716)
- [PuTTY Documentation](https://www.chiark.greenend.org.uk/~sgtatham/putty/docs.html)

---

*Last Updated: January 2025*
*Document Version: 1.0*