package io.github.qifan777.server.user.hint;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserHintCardServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private UserHintCardService service;

    @BeforeEach
    void setUp() {
        service = new UserHintCardService(jdbcTemplate);
    }

    @Test
    void balance_readsUserColumn() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("user-1"))).thenReturn(3);

        assertEquals(3, service.balance("user-1"));
    }

    @Test
    void consume_decrementsWhenSufficient() {
        when(jdbcTemplate.update(contains("hint_cards = hint_cards - ?"), eq(1), eq("user-1"), eq(1)))
                .thenReturn(1);

        service.consume("user-1", 1);

        verify(jdbcTemplate).update(contains("hint_cards = hint_cards - ?"), eq(1), eq("user-1"), eq(1));
    }
}
