package io.github.qifan777.server.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Shared MySQL + Redis Testcontainers base for SpringBoot IT.
 * Subclasses should use {@code @SpringBootTest(..., properties = "spring.profiles.active=test")}.
 */
@Testcontainers(disabledWithoutDocker = true)
public abstract class AbstractMysqlRedisSpringBootIT {

    @Container
    protected static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0")
            .withDatabaseName("mystery_box_it")
            .withUsername("test")
            .withPassword("test");

    @Container
    protected static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7"))
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void registerMysqlRedis(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.data.redis.url", () -> "redis://127.0.0.1:" + REDIS.getMappedPort(6379) + "/0");
        registry.add("DEV_DB_PASSWORD", MYSQL::getPassword);
        registry.add("payment.mock-enabled", () -> "true");
    }
}
