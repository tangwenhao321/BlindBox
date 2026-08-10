package io.github.qifan777.server.user.notification;

import io.github.qifan777.server.user.notification.dto.NotificationPrefView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserNotificationPrefServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private UserNotificationPrefService service;

    @BeforeEach
    void setUp() {
        service = new UserNotificationPrefService(jdbcTemplate);
    }

    @Test
    void get_returnsDefaultsWhenNoRow() {
        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), eq("user-1"))).thenReturn(List.of());

        NotificationPrefView view = service.get("user-1");

        assertTrue(view.orderEnabled());
        assertTrue(view.refundEnabled());
        assertTrue(view.warehouseShipEnabled());
        assertTrue(view.marketplaceEnabled());
        assertTrue(view.marketingEnabled());
    }

    @Test
    void get_returnsStoredPreference() {
        NotificationPrefView stored =
                new NotificationPrefView(true, false, true, false, true);
        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), eq("user-2")))
                .thenReturn(List.of(stored));

        NotificationPrefView view = service.get("user-2");

        assertEquals(stored, view);
    }

    @Test
    void update_upsertsPreferenceFlags() {
        NotificationPrefView input =
                new NotificationPrefView(false, true, false, true, false);

        service.update("user-3", input);

        ArgumentCaptor<Object[]> argsCaptor = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(any(String.class), argsCaptor.capture());
        Object[] args = argsCaptor.getValue();
        assertEquals("user-3", args[0]);
        assertEquals(0, args[1]);
        assertEquals(1, args[2]);
        assertEquals(0, args[3]);
        assertEquals(1, args[4]);
        assertEquals(0, args[5]);
    }

    @Test
    void find_returnsEmptyWhenMissing() {
        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), eq("user-4"))).thenReturn(List.of());

        Optional<NotificationPrefView> found = service.find("user-4");

        assertTrue(found.isEmpty());
    }
}
