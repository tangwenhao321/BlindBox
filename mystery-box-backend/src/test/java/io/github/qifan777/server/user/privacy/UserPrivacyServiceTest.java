package io.github.qifan777.server.user.privacy;

import io.github.qifan777.server.dict.model.UserStatus;

import io.github.qifan777.server.address.entity.Address;
import io.github.qifan777.server.address.repository.AddressRepository;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.user.push.UserPushTokenService;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserDraft;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserPrivacyServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private AddressRepository addressRepository;
    @Mock
    private UserPushTokenService userPushTokenService;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private UserPrivacyService service;

    @BeforeEach
    void setUp() {
        service = new UserPrivacyService(userRepository, addressRepository, userPushTokenService, jdbcTemplate);
    }

    @Test
    void exportPersonalData_returnsExpectedTopLevelKeysWithoutSecrets() {
        User user = sampleUser("u-1", "13800138000");
        when(userRepository.findById("u-1")).thenReturn(Optional.of(user));
        stubNotDeleted("u-1");
        when(jdbcTemplate.query(contains("mystery_box_order"), any(RowMapper.class), eq("u-1")))
                .thenReturn(List.of(Map.of(
                        "orderId", "ord-1",
                        "status", "FINISHED",
                        "createdTime", LocalDateTime.now().toString(),
                        "payAmount", new BigDecimal("9.90"),
                        "payTime", LocalDateTime.now().toString(),
                        "payType", "BALANCE"
                )));
        Address address = mock(Address.class);
        when(address.id()).thenReturn("addr-1");
        when(address.province()).thenReturn("HN");
        when(address.city()).thenReturn("HN");
        when(address.district()).thenReturn("Cau Giay");
        when(address.details()).thenReturn("Street 1");
        when(address.houseNumber()).thenReturn("12");
        when(address.realName()).thenReturn("Alice");
        when(address.phoneNumber()).thenReturn("13900139000");
        when(address.top()).thenReturn(true);
        when(addressRepository.findUserAll("u-1")).thenReturn(List.of(address));

        Map<String, Object> dump = service.exportPersonalData("u-1");

        assertThat(dump.keySet()).containsExactlyInAnyOrder("exportedAt", "profile", "orders", "addresses");
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) dump.get("profile");
        assertThat(profile).containsKeys("id", "phone", "nickname", "balance");
        assertThat(profile).doesNotContainKeys("password", "passwordHash", "salt", "token");
        assertThat(profile.get("phone")).isEqualTo("138****8000");
        assertThat(String.valueOf(dump)).doesNotContain(user.password());
    }

    @Test
    void requestDeletion_anonymizesPhoneSetsDeletedAtAndBlocksReuse() {
        User user = sampleUser("u-del", "13800138000");
        when(userRepository.findById("u-del")).thenReturn(Optional.of(user));
        when(jdbcTemplate.queryForObject(
                contains("deleted_at IS NOT NULL"),
                eq(Integer.class),
                eq("u-del")
        )).thenReturn(0).thenReturn(1);
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), any(), any())).thenReturn(1);
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any())).thenReturn(1);
        when(jdbcTemplate.update(anyString(), eq("u-del"))).thenReturn(1);

        UserPrivacyService.DeleteRequestResult result = service.requestDeletion("u-del");

        assertThat(result.deleted()).isTrue();
        assertThat(result.code()).isEqualTo("ACCOUNT_DELETED");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).update(userCaptor.capture());
        User updated = userCaptor.getValue();
        assertThat(updated.phone()).startsWith("d");
        assertThat(updated.phone()).doesNotContain("13800138000");
        assertThat(updated.nickname()).isEqualTo("deleted_user");
        assertThat(updated.status()).isEqualTo(UserStatus.BANNED);

        verify(jdbcTemplate).update(eq("UPDATE `user` SET deleted_at = ? WHERE id = ?"), any(LocalDateTime.class), eq("u-del"));
        verify(jdbcTemplate).update(
                contains("UPDATE address"),
                eq("00000000000"),
                eq("DELETED"),
                any(LocalDateTime.class),
                eq("u-del")
        );
        verify(userPushTokenService).deleteByUserId("u-del");

        assertThatThrownBy(() -> service.assertNotDeleted("u-del"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("注销");
        assertThat(service.isDeleted("u-del")).isTrue();
    }

    @Test
    void requestDeletion_secondCallIsIdempotent() {
        User user = sampleUser("u-2", "13900139000");
        when(userRepository.findById("u-2")).thenReturn(Optional.of(user));
        when(jdbcTemplate.queryForObject(
                contains("deleted_at IS NOT NULL"),
                eq(Integer.class),
                eq("u-2")
        )).thenReturn(1);

        UserPrivacyService.DeleteRequestResult first = service.requestDeletion("u-2");
        UserPrivacyService.DeleteRequestResult second = service.requestDeletion("u-2");

        assertThat(first.code()).isEqualTo("ACCOUNT_ALREADY_DELETED");
        assertThat(second.code()).isEqualTo("ACCOUNT_ALREADY_DELETED");
        verify(userRepository, never()).update(any(User.class));
        verify(jdbcTemplate, never()).update(contains("deleted_at"), any(), any());
        verify(userPushTokenService, never()).deleteByUserId(anyString());
        verify(userRepository, times(2)).findById("u-2");
    }

    private void stubNotDeleted(String userId) {
        when(jdbcTemplate.queryForObject(
                contains("deleted_at IS NOT NULL"),
                eq(Integer.class),
                eq(userId)
        )).thenReturn(0);
    }

    private static User sampleUser(String id, String phone) {
        return UserDraft.$.produce(draft -> {
            draft.setId(id)
                    .setPhone(phone)
                    .setPassword("secret-password-hash")
                    .setNickname("Alice")
                    .setAvatar("https://cdn.example/a.png")
                    .setGender(null)
                    .setStatus(UserStatus.NORMAL)
                    .setBalance(new BigDecimal("10.00"))
                    .setLuckyCoins(0)
                    .setStarStones(0)
                    .setHintCards(0)
                    .setInviteCode("INVITE")
                    .setCreatedTime(LocalDateTime.now().minusDays(1))
                    .setEditedTime(LocalDateTime.now());
        });
    }
}
