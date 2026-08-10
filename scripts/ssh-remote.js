#!/usr/bin/env node
/** Password SSH helper for Windows deploy (usage: node ssh-remote.js <host> <command>) */
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const host = (require.main === module ? process.argv[2] : null) || process.env.SSH_HOST || "120.26.181.145";
const cmd = process.argv.slice(3).join(" ") || "hostname && uname -a";
const password = process.env.SSH_PASSWORD || "Admin123#";
const user = process.env.SSH_USER || "root";
const port = Number(process.env.SSH_PORT || 22);

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => resolve(conn))
      .on("error", reject)
      .connect({ host, port, username: user, password, readyTimeout: 20000 });
  });
}

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      let errOut = "";
      stream.on("data", (d) => {
        out += d.toString();
        process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => {
        errOut += d.toString();
        process.stderr.write(d);
      });
      stream.on("close", (code) => {
        if (code !== 0) {
          const e = new Error(`Remote command failed (${code}): ${command.slice(0, 120)}`);
          e.code = code;
          e.out = out;
          e.errOut = errOut;
          return reject(e);
        }
        resolve({ code, out, errOut });
      });
    });
  });
}

function upload(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (putErr) => {
        if (putErr) reject(putErr);
        else resolve();
      });
    });
  });
}

async function main() {
  const conn = await connect();
  try {
    const result = await exec(conn, cmd);
    process.exit(result.code ?? 0);
  } finally {
    conn.end();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error("SSH failed:", e.message);
    process.exit(1);
  });
}

module.exports = { connect, exec, upload, host, user, password, port };
