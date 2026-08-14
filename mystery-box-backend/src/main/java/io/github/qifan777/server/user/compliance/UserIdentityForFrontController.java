package io.github.qifan777.server.user.compliance;

import lombok.RequiredArgsConstructor;
import org.babyfish.jimmer.client.ApiIgnore;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * @deprecated Prefer {@link UserComplianceForFrontController} identity endpoints
 * ({@code /front/user/compliance/identity}). Mobile already uses the compliance path
 * ({@code complianceService.ts}); these legacy verify/status endpoints return {@code 410 Gone}
 * and will be removed in a future major release once traffic is confirmed zero.
 */
@Deprecated
@ApiIgnore
@RestController
@RequestMapping("front/user")
@RequiredArgsConstructor
public class UserIdentityForFrontController {

    /**
     * @deprecated Use {@code POST /front/user/compliance/identity/verify}
     */
    @Deprecated
    @PostMapping("identity/verify")
    public ResponseEntity<Map<String, Object>> verify(@RequestBody(required = false) IdentityVerifyRequest body) {
        return gone("POST /front/user/compliance/identity/verify");
    }

    /**
     * @deprecated Use {@code GET /front/user/compliance/identity}
     */
    @Deprecated
    @GetMapping("identity/status")
    public ResponseEntity<Map<String, Object>> status() {
        return gone("GET /front/user/compliance/identity");
    }

    private static ResponseEntity<Map<String, Object>> gone(String replacement) {
        return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
                "code", "GONE",
                "message", "This endpoint is deprecated. Use " + replacement
        ));
    }

    public record IdentityVerifyRequest(String documentNumber, String fullName) {
    }
}
