# Seguridad y firewall — QuickPanel360

**QuickAgence — QuickPanel360**

---

## Reglas de firewall recomendadas

### VPS1 — Aplicación

```bash
# ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh                    # Puerto 22 (o el puerto SSH personalizado)
ufw allow 80/tcp                 # HTTP (redirige a HTTPS via Caddy)
ufw allow 443/tcp                # HTTPS
ufw allow 443/udp                # HTTP/3 / QUIC (opcional)
ufw deny 3000                    # API — NO exponer directamente
ufw deny 3001                    # Web — NO exponer directamente
ufw enable
```

### VPS2 — Datos (si se usa arquitectura 2 VPS)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow from VPS1_PRIVATE_IP to any port 5432   # PostgreSQL solo desde VPS1
ufw allow from VPS1_PRIVATE_IP to any port 6379   # Redis solo desde VPS1
ufw deny 5432                    # Denegar acceso público a PostgreSQL
ufw deny 6379                    # Denegar acceso público a Redis
ufw enable
```

> **NUNCA** exponer PostgreSQL (5432) ni Redis (6379) a internet.

---

## Protección de paneles internos

| Panel | Recomendación |
|---|---|
| Coolify / Dokploy | Detrás de Tailscale o Cloudflare Access |
| Grafana / Prometheus | Solo acceso por VPN o IP restringida |
| pgAdmin / Adminer | NUNCA en producción sin VPN |
| Netdata | Acceso restringido por IP o VPN |

**Opción recomendada**: Tailscale para acceso SSH y paneles internos.
Es gratuito para uso personal y equipo pequeño.

```bash
# Instalar Tailscale en ambos VPS
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Restringir SSH solo a IPs Tailscale en /etc/ssh/sshd_config:
# AllowUsers ubuntu@100.*.*.*
```

---

## Secretos y credenciales

### Lo que NUNCA debe estar en el repo

- `.env` reales con contraseñas
- `JWT_SECRET` en código
- `CHAT_ENCRYPTION_KEY` en código
- Credenciales de base de datos en código
- `RESEND_API_KEY` o cualquier API key

### Cómo gestionar secretos en producción

**Opción A — Archivos .env en el servidor** (simple, válido para 1-2 VPS):
```bash
# Solo el propietario puede leer el archivo
chmod 600 apps/api/.env.production
chmod 600 apps/web/.env.production
```

**Opción B — Variables de entorno del sistema** (más seguro):
```bash
# En /etc/environment o en el servicio systemd
JWT_SECRET="..."
DATABASE_URL="..."
```

**Opción C — Secrets manager** (recomendado para equipos):
- Doppler (gratuito para proyectos pequeños)
- Infisical (open source, self-hosteable)
- HashiCorp Vault (complejo pero muy potente)

---

## TLS / HTTPS

Caddy gestiona TLS automáticamente via Let's Encrypt.

**Requisitos**:
- El dominio debe apuntar a la IP pública de VPS1 antes de arrancar Caddy
- Puerto 80 y 443 deben estar abiertos
- Caddy renueva los certificados automáticamente

**Verificar**:
```bash
curl -I https://app.tudominio.com
# Debe devolver HTTP/2 200 con cabeceras de seguridad
```

---

## Backups cifrados

Si los backups contienen datos sensibles (y los de QuickPanel360 los contienen):

```bash
# Cifrar backup antes de subir a S3/R2
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in quickpanel360_backup.dump \
  -out quickpanel360_backup.dump.enc \
  -pass env:BACKUP_ENCRYPTION_KEY

# Descifrar
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in quickpanel360_backup.dump.enc \
  -out quickpanel360_backup.dump \
  -pass env:BACKUP_ENCRYPTION_KEY
```

---

## Checklist de seguridad antes de producción

- [ ] `.env` real NO está en el repositorio git
- [ ] `JWT_SECRET` es aleatorio (mínimo 32 caracteres): `openssl rand -hex 32`
- [ ] `CHAT_ENCRYPTION_KEY` es aleatorio: `openssl rand -base64 32`
- [ ] `POSTGRES_PASSWORD` es fuerte y única
- [ ] PostgreSQL NO está expuesto en internet
- [ ] Redis NO está expuesto en internet
- [ ] API (`3000`) NO está expuesto directamente (solo via Caddy)
- [ ] Web (`3001`) NO está expuesto directamente (solo via Caddy)
- [ ] SSH en un puerto no estándar o protegido con Fail2ban
- [ ] TLS/HTTPS activo y funcionando
- [ ] Cabeceras de seguridad activas (via Caddyfile)
- [ ] `CORS_ORIGIN` configurado con el dominio exacto
- [ ] Paneles internos (Coolify, etc.) detrás de VPN o Cloudflare Access
- [ ] Backups automatizados y probados
- [ ] Backup externo (no solo en el VPS)
- [ ] Sentry configurado para alertas de errores críticos
- [ ] Alertas de uptime configuradas (Uptime Kuma, BetterUptime, etc.)
