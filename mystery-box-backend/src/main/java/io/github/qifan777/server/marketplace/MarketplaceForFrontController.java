package io.github.qifan777.server.marketplace;

import cn.dev33.satoken.stp.StpUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.babyfish.jimmer.client.ApiIgnore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import io.github.qifan777.server.user.compliance.UserComplianceService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@ApiIgnore
@RestController
@RequestMapping("front/marketplace")
@RequiredArgsConstructor
public class MarketplaceForFrontController {
    private static final long CHAT_SSE_TIMEOUT_MS = 300_000L;
    private static final long CHAT_SSE_PING_SEC = 30L;

    private final MarketplaceService marketplaceService;
    private final MarketplaceChatService marketplaceChatService;
    private final MarketplaceChatSseHub marketplaceChatSseHub;
    private final ObjectMapper objectMapper;
    private final io.github.qifan777.server.infrastructure.compliance.IosDigitalGoodsGuard iosDigitalGoodsGuard;
    private final UserComplianceService userComplianceService;

    @Qualifier("sseScheduledExecutor")
    private final ScheduledExecutorService sseScheduledExecutor;

    @GetMapping("listings")
    public List<MarketplaceService.MarketplaceListingView> listings(
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice
    ) {
        return marketplaceService.listOnSale(limit, offset, keyword, sort, minPrice, maxPrice);
    }

    @GetMapping("purchased")
    public List<MarketplaceService.PurchasedListingView> purchased(
            @RequestParam(defaultValue = "30") int limit
    ) {
        return marketplaceService.listPurchasedByBuyer(StpUtil.getLoginIdAsString(), limit);
    }

    @GetMapping("my-listings")
    public List<MarketplaceService.MarketplaceListingView> myListings(
            @RequestParam(defaultValue = "30") int limit
    ) {
        return marketplaceService.listBySeller(StpUtil.getLoginIdAsString(), limit);
    }

    @GetMapping("credit")
    public Map<String, Object> myCredit() {
        String userId = StpUtil.getLoginIdAsString();
        return Map.of("userId", userId, "score", marketplaceService.getCreditScore(userId));
    }

    @PostMapping("listings")
    public String create(@RequestBody @Validated CreateListingRequest request) {
        iosDigitalGoodsGuard.rejectIfIosAppStoreClient();
        userComplianceService.assertAgeConfirmed(StpUtil.getLoginIdAsString());
        return marketplaceService.createListing(
                StpUtil.getLoginIdAsString(),
                request.orderId(),
                request.orderItemId(),
                request.productId(),
                request.price()
        );
    }

    @PostMapping("listings/{id}/cancel")
    public void cancel(@PathVariable String id) {
        marketplaceService.cancelListing(StpUtil.getLoginIdAsString(), id);
    }

    @PostMapping("listings/{id}/buy")
    public String buy(@PathVariable String id) {
        iosDigitalGoodsGuard.rejectIfIosAppStoreClient();
        userComplianceService.assertAgeConfirmed(StpUtil.getLoginIdAsString());
        return marketplaceService.buyListing(StpUtil.getLoginIdAsString(), id);
    }

    @PostMapping("listings/{id}/cancel-trade")
    public void cancelTrade(@PathVariable String id) {
        marketplaceService.cancelTradeByBuyer(StpUtil.getLoginIdAsString(), id);
    }

    @PostMapping("trades/{tradeId}/rate")
    public void rate(@PathVariable String tradeId, @RequestBody @Validated RateRequest request) {
        marketplaceService.rateTrade(StpUtil.getLoginIdAsString(), tradeId, request.score());
    }

    @PostMapping("listings/{id}/certificate")
    public String submitCertificate(@PathVariable String id, @RequestBody @Validated CertificateSubmitRequest request) {
        return marketplaceService.submitCertificate(
                StpUtil.getLoginIdAsString(),
                id,
                request.videoUrl(),
                request.productUniqueId(),
                request.ipLicenseText()
        );
    }

    @GetMapping("listings/{id}/certificate")
    public MarketplaceService.CertificateView certificate(@PathVariable String id) {
        return marketplaceService.getCertificate(id);
    }

    @GetMapping("listings/{id}/chat")
    public List<MarketplaceChatService.ChatMessage> chat(
            @PathVariable String id,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return marketplaceChatService.listChat(id, StpUtil.getLoginIdAsString(), limit);
    }

    @GetMapping(value = "listings/{id}/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@PathVariable String id) {
        String userId = StpUtil.getLoginIdAsString();
        List<MarketplaceChatService.ChatMessage> initial = marketplaceChatService.listChat(id, userId, 50);
        SseEmitter emitter = new SseEmitter(CHAT_SSE_TIMEOUT_MS);
        marketplaceChatSseHub.register(id, emitter);
        try {
            emitter.send(SseEmitter.event().name("CHAT_UPDATE").data(objectMapper.writeValueAsString(initial)));
        } catch (Exception ex) {
            marketplaceChatSseHub.unregister(id, emitter);
            emitter.completeWithError(ex);
            return emitter;
        }
        ScheduledFuture<?> pingFuture = sseScheduledExecutor.scheduleAtFixedRate(() -> {
            try {
                emitter.send(SseEmitter.event().name("ping").data(""));
            } catch (Exception ex) {
                marketplaceChatSseHub.unregister(id, emitter);
                emitter.completeWithError(ex);
            }
        }, CHAT_SSE_PING_SEC, CHAT_SSE_PING_SEC, TimeUnit.SECONDS);
        emitter.onCompletion(() -> {
            pingFuture.cancel(true);
            marketplaceChatSseHub.unregister(id, emitter);
        });
        emitter.onTimeout(() -> {
            pingFuture.cancel(true);
            marketplaceChatSseHub.unregister(id, emitter);
            emitter.complete();
        });
        emitter.onError((ex) -> {
            pingFuture.cancel(true);
            marketplaceChatSseHub.unregister(id, emitter);
        });
        return emitter;
    }

    @PostMapping("listings/{id}/chat")
    public void postChat(@PathVariable String id, @RequestBody ChatRequest body) {
        marketplaceChatService.postChat(id, StpUtil.getLoginIdAsString(), body.msgType(), body.body());
    }

    public record CreateListingRequest(
            @NotBlank String orderId,
            @NotBlank String orderItemId,
            @NotBlank String productId,
            @NotNull @DecimalMin("0.01") BigDecimal price
    ) {
    }

    public record RateRequest(
            @NotNull @DecimalMin("1") @DecimalMax("5") BigDecimal score
    ) {
    }

    public record CertificateSubmitRequest(
            @NotBlank String videoUrl,
            String productUniqueId,
            String ipLicenseText
    ) {
    }

    public record ChatRequest(String msgType, String body) {
    }
}
