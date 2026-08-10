package io.github.qifan777.server;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.qifan777.server.box.order.config.RedeemProperties;
import io.github.qifan777.server.infrastructure.model.TenantMapProperty;
import io.github.qifan777.server.infrastructure.model.WxPayPropertiesExtension;
import org.babyfish.jimmer.client.EnableImplicitApi;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@EnableAsync
@SpringBootApplication
@EnableImplicitApi
@EnableConfigurationProperties(value = {WxPayPropertiesExtension.class, TenantMapProperty.class, RedeemProperties.class})
public class ServerApplication {
    public static void main(String[] args) {
        loadDotEnvIfPresent();
        SpringApplication.run(ServerApplication.class, args);
    }

    /**
     * 与 vipDistributionMall 类似：项目根目录存在 .env 时，在 Spring 启动前注入系统属性（不覆盖已有环境变量/系统属性）。
     */
    private static void loadDotEnvIfPresent() {
        try {
            Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
            dotenv.entries().forEach(entry -> {
                String key = entry.getKey();
                String value = entry.getValue();
                if (key == null || key.isBlank() || value == null) {
                    return;
                }
                if (System.getenv(key) == null && System.getProperty(key) == null) {
                    System.setProperty(key, value);
                }
            });
        } catch (Exception ignored) {
            // .env 可选；解析失败时不阻塞启动
        }
    }
}
