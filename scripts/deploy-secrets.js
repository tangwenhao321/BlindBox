/** Shared env guards for deploy/ops scripts — never hardcode secrets. */
function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return String(v).trim();
}

function mysqlRootPassword() {
  return requireEnv("TEST_DB_PASSWORD");
}

/** Escape for remote bash single-quoted string. */
function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function mysqlDocker(sqlOrArgs, { interactive = false } = {}) {
  const pass = shellSingleQuote(mysqlRootPassword());
  const execCmd = interactive ? "docker exec -i" : "docker exec";
  return `${execCmd} ehpay-mysql mysql -uroot -p${pass} ${sqlOrArgs}`;
}

function assertDropConfirmed() {
  if (process.env.CONFIRM_DROP_DB !== "1") {
    console.error("Refusing destructive DB wipe. Set CONFIRM_DROP_DB=1 to proceed.");
    process.exit(1);
  }
}

module.exports = { requireEnv, mysqlRootPassword, shellSingleQuote, mysqlDocker, assertDropConfirmed };
