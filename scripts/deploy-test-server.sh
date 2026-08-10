#!/usr/bin/env bash
# 在 Linux 测试服务器上执行 — 盲盒商城测试环境（与四方 vipDistributionMall 隔离）
# 用法:
#   sudo bash scripts/deploy-test-server.sh bootstrap  # 首次：目录 + .env 模板
#   sudo bash scripts/deploy-test-server.sh deps       # 仅 Docker MySQL/Redis 测试实例
#   sudo bash scripts/deploy-test-server.sh build      # 编译后端 + 管理端
#   sudo bash scripts/deploy-test-server.sh deploy     # 构建并重启 systemd 服务
#   sudo bash scripts/deploy-test-server.sh status     # 查看状态
#
# 前置: 将代码放到 /opt/mystery-box-test/src 并配置 /opt/mystery-box-test/.env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/mystery-box-test}"
ENV_FILE="${DEPLOY_ROOT}/.env"
SERVICE_NAME="mystery-box-test"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

load_env() {
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  fi
}

cmd_bootstrap() {
  cmd_install
  load_env
  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "$ROOT/deploy/test-server.jarcheng.env.example" ]]; then
      cp "$ROOT/deploy/test-server.jarcheng.env.example" "$ENV_FILE"
      log "Created $ENV_FILE from jarcheng template — edit DB password before deploy."
    elif [[ -f "$ROOT/deploy/test-server.env.example" ]]; then
      cp "$ROOT/deploy/test-server.env.example" "$ENV_FILE"
      log "Created $ENV_FILE from example — edit before deploy."
    fi
  fi
  load_env
  mkdir -p "${UPLOAD_DIR:-$DEPLOY_ROOT/data/uploads-test}"
  if command -v mysql >/dev/null && [[ -f "$ROOT/deploy/sql/init-test-mysql.sql" ]]; then
    log "Run MySQL init manually if not done:"
    log "  mysql -uroot -p < $ROOT/deploy/sql/init-test-mysql.sql"
  fi
  log "Bootstrap done. Edit $ENV_FILE then: sudo bash scripts/deploy-test-server.sh deploy"
}

cmd_install() {
  log "Checking prerequisites..."
  command -v java >/dev/null || { echo "Need JDK 17+"; exit 1; }
  command -v mvn >/dev/null || { echo "Need Maven"; exit 1; }
  command -v node >/dev/null || { echo "Need Node.js 18+"; exit 1; }
  command -v npm >/dev/null || { echo "Need npm"; exit 1; }
  id "${APP_USER:-mysterybox}" &>/dev/null || useradd -r -s /bin/false "${APP_USER:-mysterybox}" || true
  mkdir -p "$DEPLOY_ROOT"/{releases,logs,data/uploads-test,config}
  log "OK. Copy deploy/test-server.env.example to $ENV_FILE and edit."
}

cmd_deps() {
  log "Starting isolated MySQL(3307) + Redis(6381) via docker compose..."
  cd "$ROOT"
  docker compose -f docker-compose.test.yml up -d
  log "Wait for healthy containers..."
  sleep 15
  docker ps --filter name=mystery-box-test
}

cmd_build() {
  load_env
  PRIVATE_TEST="$ROOT/mystery-box-backend/src/main/resources/application-private-test.yml"
  if [[ ! -f "$PRIVATE_TEST" ]]; then
    cp "$ROOT/mystery-box-backend/src/main/resources/application-private.test.example.yml" "$PRIVATE_TEST"
    log "Created application-private-test.yml from example — review DB password."
  fi
  mkdir -p "${UPLOAD_DIR:-$DEPLOY_ROOT/data/uploads-test}"
  log "Building backend JAR..."
  cd "$ROOT/mystery-box-backend"
  mvn -DskipTests clean package -q
  JAR="$(ls target/mystery-box-backend-*.jar | head -1)"
  cp "$JAR" "$DEPLOY_ROOT/releases/mystery-box-backend.jar"
  log "Backend JAR -> $DEPLOY_ROOT/releases/mystery-box-backend.jar"

  log "Building admin static..."
  cd "$ROOT/mystery-box-admin"
  npm ci --silent
  export VITE_API_PREFIX="${VITE_API_PREFIX:-/api}"
  export VITE_BASE="${VITE_BASE:-/}"
  npm run build:test
  rm -rf "$DEPLOY_ROOT/releases/admin-dist"
  cp -r dist "$DEPLOY_ROOT/releases/admin-dist"
  log "Admin dist -> $DEPLOY_ROOT/releases/admin-dist (base=${VITE_BASE})"
}

write_systemd() {
  load_env
  local jar="$DEPLOY_ROOT/releases/mystery-box-backend.jar"
  local port="${TEST_SERVER_PORT:-9913}"
  cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Mystery Box Test Backend (isolated from vip mall)
After=network.target docker.service

[Service]
Type=simple
User=${APP_USER:-mysterybox}
WorkingDirectory=$DEPLOY_ROOT
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/java -Xms512m -Xmx1024m -jar $jar --server.port=$port
Restart=on-failure
RestartSec=5
StandardOutput=append:$DEPLOY_ROOT/logs/backend.log
StandardError=append:$DEPLOY_ROOT/logs/backend.err.log

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable "${SERVICE_NAME}.service"
}

cmd_deploy_only() {
  load_env
  local jar="$DEPLOY_ROOT/releases/mystery-box-backend.jar"
  [[ -f "$jar" ]] || { echo "Missing $jar — run build locally first"; exit 1; }
  write_systemd
  chown -R "${APP_USER:-mysterybox}:${APP_USER:-mysterybox}" "$DEPLOY_ROOT/data" "$DEPLOY_ROOT/logs" 2>/dev/null || true
  log "Restarting ${SERVICE_NAME}..."
  systemctl restart "${SERVICE_NAME}.service"
  sleep 8
  curl -sf "http://127.0.0.1:${TEST_SERVER_PORT:-9913}/actuator/health" && log "Health OK" || {
    log "Health check failed — tail $DEPLOY_ROOT/logs/backend.err.log"
    tail -n 80 "$DEPLOY_ROOT/logs/backend.err.log" 2>/dev/null || true
    exit 1
  }
  log "Deploy complete."
}

cmd_deploy() {
  cmd_build
  cmd_deploy_only
}

cmd_status() {
  systemctl status "${SERVICE_NAME}.service" --no-pager || true
  load_env
  curl -sf "http://127.0.0.1:${TEST_SERVER_PORT:-9913}/actuator/health" | head -c 200 || true
  echo
}

case "${1:-deploy}" in
  bootstrap) cmd_bootstrap ;;
  install) cmd_install ;;
  deps) cmd_deps ;;
  build) cmd_build ;;
  deploy) cmd_deploy ;;
  status) cmd_status ;;
  deploy-only) cmd_deploy_only ;;
  *) echo "Usage: $0 {bootstrap|install|deps|build|deploy|deploy-only|status}"; exit 1 ;;
esac
