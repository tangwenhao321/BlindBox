package io.github.qifan777.server.oss;

import cn.dev33.satoken.stp.StpUtil;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OSSControllerIT {
    @Autowired(required = false)
    private MockMvc mockMvc;

    @DynamicPropertySource
    static void ossLocal(DynamicPropertyRegistry registry) {
        registry.add("oss.provider", () -> "local");
        registry.add("oss.local.base-dir", () -> "./target/test-uploads");
        registry.add("oss.local.public-base-url", () -> "/uploads");
        String password = System.getenv().getOrDefault("DEV_DB_PASSWORD", "Admin123#");
        registry.add("spring.datasource.url", () -> "jdbc:mysql://localhost:3306/mystery_box");
        registry.add("spring.datasource.username", () -> "root");
        registry.add("spring.datasource.password", () -> password);
        registry.add("spring.data.redis.url", () -> "redis://127.0.0.1:6379/0");
    }

    @Test
    void upload_png_returnsRelativeUrl() throws Exception {
        Assumptions.assumeTrue(mockMvc != null);
        StpUtil.login("oss-it-user");
        try {
            byte[] png = new byte[]{
                    (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x00,
                    0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08,
                    0x06, 0x00, 0x00, 0x00, (byte) 0x1F, 0x15, (byte) 0xC4, (byte) 0x89,
                    0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54,
                    0x78, (byte) 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
                    0x0D, 0x0A, 0x2D, (byte) 0xB4, 0x00, 0x00, 0x00, 0x00,
                    0x49, 0x45, 0x4E, 0x44, (byte) 0xAE, 0x42, 0x60, (byte) 0x82
            };
            MockMultipartFile file = new MockMultipartFile(
                    "file", "t.png", "image/png", png
            );
            mockMvc.perform(MockMvcRequestBuilders.multipart("/oss/upload")
                            .file(file)
                            .header("token", StpUtil.getTokenValue()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.result", startsWith("/uploads/")));
        } finally {
            StpUtil.logout();
        }
    }
}
