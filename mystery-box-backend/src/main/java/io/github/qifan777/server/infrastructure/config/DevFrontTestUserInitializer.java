package io.github.qifan777.server.infrastructure.config;

import io.github.qifan777.server.dict.model.UserStatus;

import cn.dev33.satoken.secure.BCrypt;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.role.entity.Role;
import io.github.qifan777.server.role.repository.RoleRepository;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserDraft;
import io.github.qifan777.server.user.root.entity.UserTable;
import io.github.qifan777.server.user.root.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ensures a mobile-friendly test account exists for local Expo Go login
 * (matches MAESTRO_TEST_* / .env.example defaults).
 */
@Component
@ConditionalOnProperty(name = "app.auth.seed-dev-mobile-user", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class DevFrontTestUserInitializer implements ApplicationRunner {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JdbcTemplate jdbcTemplate;

    @Value("${app.auth.dev-mobile-phone:13800138000}")
    private String phone;

    @Value("${app.auth.dev-mobile-password:Admin@123456}")
    private String password;

    @Override
    public void run(ApplicationArguments args) {
        String normalizedPhone = phone == null ? "" : phone.trim();
        String normalizedPassword = password == null ? "" : password.trim();
        if (!normalizedPhone.matches("^1\\d{10}$") || normalizedPassword.length() < 6) {
            log.warn("dev mobile user init skipped: invalid phone/password configuration");
            return;
        }

        UserTable userTable = UserTable.$;
        User devUser = userRepository.sql()
                .createQuery(userTable)
                .where(userTable.phone().eq(normalizedPhone))
                .select(userTable.fetch(UserRepository.USER_ROLE_FETCHER))
                .fetchOptional()
                .orElseGet(() -> {
                    User created = userRepository.save(UserDraft.$.produce(draft -> draft
                            .setPhone(normalizedPhone)
                            .setPassword(BCrypt.hashpw(normalizedPassword))
                            .setNickname("Expo测试用户")
                            .setStatus(UserStatus.NORMAL)
                            .setBalance(BigDecimal.ZERO)));
                    log.info("dev mobile test user created: phone={}", normalizedPhone);
                    return created;
                });

        Role normalRole = roleRepository.findRoleByName("普通用户").orElse(null);
        if (normalRole == null) {
            log.warn("dev mobile user init skipped: 普通用户 role missing");
            return;
        }
        Integer relationCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM user_role_rel WHERE role_id = ? AND user_id = ?",
                Integer.class,
                normalRole.id(),
                devUser.id()
        );
        if (relationCount == null || relationCount == 0) {
            LocalDateTime now = LocalDateTime.now();
            jdbcTemplate.update(
                    "INSERT INTO user_role_rel(id, created_time, edited_time, creator_id, editor_id, role_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID().toString().replace("-", ""),
                    Timestamp.valueOf(now),
                    Timestamp.valueOf(now),
                    devUser.id(),
                    devUser.id(),
                    normalRole.id(),
                    devUser.id()
            );
            log.info("dev mobile test user role bound: phone={}", normalizedPhone);
        }
    }
}
