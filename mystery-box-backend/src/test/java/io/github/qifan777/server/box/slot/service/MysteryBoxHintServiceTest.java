package io.github.qifan777.server.box.slot.service;

import tools.jackson.databind.json.JsonMapper;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.user.hint.UserHintCardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import org.springframework.jdbc.core.RowMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MysteryBoxHintServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private MysteryBoxRepository mysteryBoxRepository;
    @Mock
    private UserHintCardService userHintCardService;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private MysteryBoxHintService service;

    @BeforeEach
    void setUp() {
        service = new MysteryBoxHintService(
                redisTemplate,
                JsonMapper.shared(),
                mysteryBoxRepository,
                userHintCardService,
                jdbcTemplate
        );
        ReflectionTestUtils.setField(service, "maxHintsPerSession", 3);
        ReflectionTestUtils.setField(service, "dailyLimitFallback", 20);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void hint_usesLightweightQualityQuery() {
        when(mysteryBoxRepository.existsById("box-1")).thenReturn(true);
        when(valueOperations.get(anyString())).thenReturn(null);
        when(jdbcTemplate.queryForList("SELECT config_key, config_value FROM hint_policy_config"))
                .thenReturn(List.of());
        when(jdbcTemplate.query(contains("mystery_box_product_rel"), any(RowMapper.class), eq("box-1")))
                .thenReturn(List.of("R", "SR"));
        when(userHintCardService.balance("user-1")).thenReturn(4);

        MysteryBoxHintService.HintResultView result = service.hint("box-1", "user-1");

        assertNotNull(result.excludedQualityType());
        assertEquals(1, result.excludedQualityTypes().size());
        assertEquals(4, result.hintCardsRemaining());
    }
}
