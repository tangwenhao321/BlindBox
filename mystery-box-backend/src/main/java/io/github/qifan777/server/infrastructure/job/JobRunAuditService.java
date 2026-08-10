package io.github.qifan777.server.infrastructure.job;

import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JobRunAuditService {
    private final JdbcTemplate jdbcTemplate;

    public void record(String jobName, String status, String message, long durationMs, LocalDateTime startedAt) {
        jdbcTemplate.update(
                """
                        INSERT INTO job_run_audit(id, job_name, status, message, duration_ms, started_at, finished_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                IdUtil.fastSimpleUUID(),
                jobName,
                status,
                message == null ? "" : message.substring(0, Math.min(512, message.length())),
                durationMs,
                startedAt,
                LocalDateTime.now()
        );
    }

    public List<Map<String, Object>> recentRuns(String jobName, int limit) {
        int capped = Math.min(Math.max(limit, 1), 100);
        if (jobName == null || jobName.isBlank()) {
            return jdbcTemplate.queryForList(
                    "SELECT job_name, status, message, duration_ms, started_at, finished_at FROM job_run_audit ORDER BY started_at DESC LIMIT ?",
                    capped
            );
        }
        return jdbcTemplate.queryForList(
                "SELECT job_name, status, message, duration_ms, started_at, finished_at FROM job_run_audit WHERE job_name = ? ORDER BY started_at DESC LIMIT ?",
                jobName,
                capped
        );
    }

    public <T> T runWithAudit(String jobName, JobRunner<T> runner) {
        LocalDateTime startedAt = LocalDateTime.now();
        long startedMs = System.currentTimeMillis();
        try {
            T result = runner.run();
            record(jobName, "SUCCESS", null, System.currentTimeMillis() - startedMs, startedAt);
            return result;
        } catch (Exception ex) {
            record(jobName, "FAILED", ex.getMessage(), System.currentTimeMillis() - startedMs, startedAt);
            if (ex instanceof RuntimeException runtime) {
                throw runtime;
            }
            throw new RuntimeException(ex);
        }
    }

    public void runWithAudit(String jobName, Runnable runner) {
        runWithAudit(jobName, () -> {
            runner.run();
            return null;
        });
    }

    @FunctionalInterface
    public interface JobRunner<T> {
        T run() throws Exception;
    }
}
