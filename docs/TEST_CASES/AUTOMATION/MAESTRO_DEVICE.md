# Maestro device smoke (optional)

Default CI only validates flow inventory via `scripts/maestro-ci-smoke.sh`.

To run PR smoke on a device/emulator:

```bash
export MAESTRO_RUN_DEVICE=1
bash scripts/maestro-ci-smoke.sh
```

GitHub Actions tip: use a self-hosted runner or `reactivecircus/android-emulator-runner` with:

```yaml
env:
  MAESTRO_RUN_DEVICE: "1"
```

Do not enable by default on free GitHub runners (slow / flaky).
