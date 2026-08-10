package io.github.qifan777.server.infrastructure.config;

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
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "security.default-admin.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DefaultAdminInitializer implements ApplicationRunner {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JdbcTemplate jdbcTemplate;

    @Value("${security.default-admin.account:admin}")
    private String account;

    @Value("${security.default-admin.password:Admin@123456}")
    private String password;

    @Override
    public void run(ApplicationArguments args) {
        String normalizedAccount = account == null ? "" : account.trim();
        String normalizedPassword = password == null ? "" : password.trim();
        if (normalizedAccount.isBlank() || normalizedPassword.length() < 6) {
            log.warn("default admin init skipped: invalid account/password configuration");
            return;
        }

        UserTable userTable = UserTable.$;
        User adminUser = userRepository.sql()
                .createQuery(userTable)
                .where(userTable.phone().eq(normalizedAccount))
                .select(userTable.fetch(UserRepository.USER_ROLE_FETCHER))
                .fetchOptional()
                .orElseGet(() -> {
                    User created = userRepository.save(UserDraft.$.produce(draft -> draft
                            .setPhone(normalizedAccount)
                            .setPassword(BCrypt.hashpw(normalizedPassword))
                            .setNickname("默认管理员")
                            .setStatus(DictConstants.UserStatus.NORMAL)
                            .setBalance(BigDecimal.ZERO)));
                    log.info("default admin user created: account={}", normalizedAccount);
                    return created;
                });
        adminUser = userRepository.sql()
                .createQuery(userTable)
                .where(userTable.id().eq(adminUser.id()))
                .select(userTable.fetch(UserRepository.USER_ROLE_FETCHER))
                .fetchOne();

        Role adminRole = roleRepository.findRoleByName("管理员")
                .orElseThrow(() -> new IllegalStateException("管理员角色不存在"));
        Integer relationCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM user_role_rel WHERE role_id = ? AND user_id = ?",
                Integer.class,
                adminRole.id(),
                adminUser.id()
        );
        boolean hasAdminRole = relationCount != null && relationCount > 0;
        if (!hasAdminRole) {
            LocalDateTime now = LocalDateTime.now();
            jdbcTemplate.update(
                    "INSERT INTO user_role_rel(id, created_time, edited_time, creator_id, editor_id, role_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID().toString().replace("-", ""),
                    Timestamp.valueOf(now),
                    Timestamp.valueOf(now),
                    adminUser.id(),
                    adminUser.id(),
                    adminRole.id(),
                    adminUser.id()
            );
            log.info("default admin role bound: account={}", normalizedAccount);
        }
    }
}
